import { playlistKeys } from '@/hooks/queries/db/playlist'
import { queryClient } from '@/lib/config/queryClient'
import { playlistFacade } from '@/lib/facades/playlist'
import { syncFacade } from '@/lib/facades/sync'
import { playlistService } from '@/lib/services/playlistService'
import type { Playlist } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { UpdatePlaylistPayload } from '@/types/services/playlist'
import type { CreateTrackPayload } from '@/types/services/track'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'

queryClient.setMutationDefaults(['db', 'playlists'], {
	retry: false,
})

export const usePlaylistSync = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'sync'],
		mutationFn: async ({
			remoteSyncId,
			type,
		}: {
			remoteSyncId: number
			type: Playlist['type']
		}) => {
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
		onError: (error, { remoteSyncId, type }) =>
			toastAndLogError(
				`同步播放列表失败: remoteSyncId=${remoteSyncId}, type=${type}`,
				error,
			),
	})
}

/**
 * 针对单个音轨，批量更新它所在的本地播放列表。
 * 当该 track 不存在时，会自动创建
 * 你可能并不需要直接使用此 mutation，请去使用 <AddVideoToLocalPlaylistModal /> 组件
 * @returns
 */
export const useUpdateTrackLocalPlaylists = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'updateTrackLocalPlaylists'],
		mutationFn: async (args: {
			toAddPlaylistIds: number[]
			toRemovePlaylistIds: number[]
			trackPayload: CreateTrackPayload
			artistPayload?: CreateArtistPayload | null
		}) => {
			const res = await playlistFacade.updateTrackLocalPlaylists(args)
			if (res.isErr()) throw res.error
			return res.value
		},
		onSuccess: (trackId, { toAddPlaylistIds, toRemovePlaylistIds }) => {
			toast.success('操作成功')
			const promises: Promise<unknown>[] = []
			promises.push(
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistsContainingTrack(trackId),
				}),
			)
			promises.push(
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
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
		onError: (error, { trackPayload }) =>
			toastAndLogError(
				`操作音频收藏位置失败: trackTitle=${trackPayload.title}`,
				error,
			),
	})
}

export const useDuplicatePlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'duplicatePlaylist'],
		mutationFn: async ({
			playlistId,
			name,
		}: {
			playlistId: number
			name: string
		}) => {
			const result = await playlistFacade.duplicatePlaylist(playlistId, name)
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
		onError: (error, { playlistId, name }) =>
			toastAndLogError(
				`复制播放列表失败: playlistId=${playlistId}, name=${name}`,
				error,
			),
	})
}

export const useEditPlaylistMetadata = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'editPlaylistMetadata'],
		mutationFn: async ({
			playlistId,
			payload,
		}: {
			playlistId: number
			payload: UpdatePlaylistPayload
		}) => {
			if (playlistId === 0) return
			const result = await playlistService.updatePlaylistMetadata(
				playlistId,
				payload,
			)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: (_, variables) => {
			toast.success('操作成功')
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(variables.playlistId),
				}),
			])
		},
		onError: (error, { playlistId }) =>
			toastAndLogError(`修改播放列表信息失败：playlistId=${playlistId}`, error),
	})
}

export const useDeletePlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'deletePlaylist'],
		mutationFn: async ({ playlistId }: { playlistId: number }) => {
			const result = await playlistService.deletePlaylist(playlistId)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: () => {
			toast.success('删除成功')
			void queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistLists(),
			})
		},
		onError: (error, { playlistId }) =>
			toastAndLogError(`删除播放列表失败: playlistId=${playlistId}`, error),
	})
}

export const useDeleteTrackFromLocalPlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'deleteTrackFromLocalPlaylist'],
		mutationFn: async ({
			trackId,
			playlistId,
		}: {
			trackId: number
			playlistId: number
		}) => {
			const result = await playlistService.removeTrackFromLocalPlaylist(
				playlistId,
				trackId,
			)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: (_, variables) => {
			toast.success('删除成功')
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistsContainingTrack(variables.trackId),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistContents(variables.playlistId),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(variables.playlistId),
				}),
			])
		},
		onError: (error) => toastAndLogError('从播放列表中删除 track 失败', error),
	})
}

export const useCreateNewLocalPlaylist = () => {
	return useMutation({
		mutationFn: async (payload: {
			title: string
			description?: string
			coverUrl?: string
		}) => {
			const result = await playlistService.createPlaylist({
				...payload,
				type: 'local',
			})
			if (result.isErr()) throw result.error
			return result.value
		},
		onSuccess: (playlist) => {
			toast.success('创建播放列表成功')
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistContents(playlist.id),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(playlist.id),
				}),
			])
		},
		onError: (error) => toastAndLogError('创建播放列表失败', error),
	})
}
