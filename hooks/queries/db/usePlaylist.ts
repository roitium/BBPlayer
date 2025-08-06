import { queryClient } from '@/lib/config/queryClient'
import { syncFacade } from '@/lib/facades/sync'
import { playlistService } from '@/lib/services/playlistService'
import type { Playlist } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import toast from '@/utils/toast'
import { useMutation, useQuery } from '@tanstack/react-query'

export const playlistKeys = {
	all: ['db', 'playlists'] as const,
	playlistLists: () => [...playlistKeys.all, 'playlistLists'] as const,
	playlistContents: (playlistId: number) =>
		[...playlistKeys.all, 'playlistContents', playlistId] as const,
	playlistMetadata: (playlistId: number) =>
		[...playlistKeys.all, 'playlistMetadata', playlistId] as const,
	syncPlaylist: (remoteId: number, type: Playlist['type']) =>
		[...playlistKeys.all, 'syncPlaylist', remoteId, type] as const,
}

export const usePlaylistLists = () => {
	return useQuery({
		queryKey: playlistKeys.playlistLists(),
		queryFn: () => returnOrThrowAsync(playlistService.getAllPlaylists()),
		staleTime: 0,
	})
}

export const usePlaylistContents = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistContents(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistTracks(playlistId)),
		staleTime: 0,
	})
}

export const usePlaylistMetadata = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistMetadata(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistMetadata(playlistId)),
		staleTime: 0,
	})
}

export const usePlaylistSync = (
	type: Playlist['type'],
	remoteSyncId: number,
) => {
	return useMutation({
		mutationKey: playlistKeys.syncPlaylist(remoteSyncId, type),
		mutationFn: async () => {
			if (remoteSyncId === 0) throw new Error('remoteSyncId 不能为空')
			const result = await syncFacade.sync(remoteSyncId, type)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: (id) => {
			toast.success('同步成功')
			if (!id) return
			void Promise.all([
				queryClient.refetchQueries({
					queryKey: playlistKeys.playlistContents(id),
				}),
				queryClient.refetchQueries({
					queryKey: playlistKeys.playlistMetadata(id),
				}),
				queryClient.refetchQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
			])
		},
		onError: (error) => {
			toast.error('同步失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}
