import { queryClient } from '@/lib/config/queryClient'
import db from '@/lib/db/db'
import { playlistFacade } from '@/lib/facades/playlist'
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
	playlistsContainingTrack: (trackId: number) =>
		[...playlistKeys.all, 'playlistsContainingTrack', trackId] as const,
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

export const usePlaylistSync = () => {
	return useMutation({
		mutationFn: async ({
			remoteSyncId,
			type,
		}: {
			remoteSyncId: number
			type: Playlist['type']
		}) => {
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

export const usePlaylistsContainingTrack = (trackId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistsContainingTrack(trackId),
		queryFn: () =>
			returnOrThrowAsync(
				playlistService.getLocalPlaylistsContainingTrack(trackId),
			),
		enabled: !!trackId,
	})
}

export const useUpdateLocalPlaylistTracks = () => {
	return useMutation({
		mutationFn: async ({
			toAddPlaylistIds,
			toRemovePlaylistIds,
			trackId,
		}: {
			toAddPlaylistIds: number[]
			toRemovePlaylistIds: number[]
			trackId: number
		}) => {
			await db.transaction(async (tx) => {
				const playlistSvc = playlistService.withDB(tx)
				for (const playlistId of toAddPlaylistIds) {
					await playlistSvc.addTrackToLocalPlaylist(playlistId, trackId)
				}
				for (const playlistId of toRemovePlaylistIds) {
					await playlistSvc.removeTrackFromLocalPlaylist(playlistId, trackId)
				}
			})
		},
		onSuccess: (_, variables) => {
			const { toAddPlaylistIds, toRemovePlaylistIds, trackId } = variables
			toast.success('操作成功')
			const promises = []
			promises.push(
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistsContainingTrack(trackId),
				}),
			)
			for (const id of [...toAddPlaylistIds, ...toRemovePlaylistIds]) {
				promises.push(
					queryClient.invalidateQueries({
						queryKey: playlistKeys.playlistContents(id),
					}),
				)
				promises.push(
					queryClient.invalidateQueries({
						queryKey: playlistKeys.playlistMetadata(id),
					}),
				)
			}
			void Promise.all(promises)
		},
		onError: (error) => {
			toast.error('操作音频收藏位置失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}

export const useCopyRemotePlaylistToLocalPlaylist = () => {
	return useMutation({
		mutationFn: async ({ playlistId }: { playlistId: number }) => {
			if (playlistId === 0) return
			const result =
				await playlistFacade.copyRemotePlaylistToLocalPlaylist(playlistId)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: () => {
			toast.success('复制成功')
			void queryClient.refetchQueries({
				queryKey: playlistKeys.playlistLists(),
			})
		},
		onError: (error) => {
			toast.error('复制失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}
