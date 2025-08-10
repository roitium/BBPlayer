import { playlistKeys } from '@/hooks/queries/db/usePlaylist'
import { queryClient } from '@/lib/config/queryClient'
import db from '@/lib/db/db'
import { playlistFacade } from '@/lib/facades/playlist'
import { syncFacade } from '@/lib/facades/sync'
import { playlistService } from '@/lib/services/playlistService'
import { trackService } from '@/lib/services/trackService'
import type { Playlist } from '@/types/core/media'
import type { UpdatePlaylistPayload } from '@/types/services/playlist'
import type { CreateTrackPayload } from '@/types/services/track'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'

const logger = log.extend('mutations/db/playlist')

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
		onError: (error, variables) => {
			logger.error('同步失败: ', flatErrorMessage(error), variables)
			toast.error('同步失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}

/**
 * 针对单个音轨，批量更新它所在的本地播放列表。
 * 当该 track 不存在时，会自动创建
 * @returns
 */
export const useUpdateTrackLocalPlaylists = () => {
	return useMutation({
		mutationKey: ['db', 'playlists', 'updateTrackLocalPlaylists'],
		mutationFn: async ({
			toAddPlaylistIds,
			toRemovePlaylistIds,
			trackPayload,
		}: {
			toAddPlaylistIds: number[]
			toRemovePlaylistIds: number[]
			trackPayload: CreateTrackPayload
		}) => {
			return await db.transaction(async (tx) => {
				const playlistSvc = playlistService.withDB(tx)
				const trackSvc = trackService.withDB(tx)
				const track = await trackSvc.findOrCreateTrack(trackPayload)
				if (track.isErr()) {
					throw track.error
				}
				const trackId = track.value.id
				for (const playlistId of toAddPlaylistIds) {
					await playlistSvc.addTrackToLocalPlaylist(playlistId, trackId)
				}
				for (const playlistId of toRemovePlaylistIds) {
					await playlistSvc.removeTrackFromLocalPlaylist(playlistId, trackId)
				}
				return trackId
			})
		},
		onSuccess: (trackId, variables) => {
			const { toAddPlaylistIds, toRemovePlaylistIds } = variables
			toast.success('操作成功')
			const promises = []
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
		onError: (error, variables) => {
			logger.error('操作音频收藏位置失败: ', flatErrorMessage(error), variables)
			toast.error('操作音频收藏位置失败', {
				description: flatErrorMessage(error),
			})
		},
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
		onError: (error, variables) => {
			logger.error('复制失败: ', flatErrorMessage(error), variables)
			toast.error('复制失败', {
				description: flatErrorMessage(error),
			})
		},
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
		onError: (error, variables) => {
			logger.error('修改播放列表信息失败: ', flatErrorMessage(error), variables)
			toast.error('修改播放列表信息失败', {
				description: flatErrorMessage(error),
			})
		},
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
		onError: (error, variables) => {
			logger.error('删除播放列表失败: ', flatErrorMessage(error), variables)
			toast.error('删除播放列表失败', {
				description: flatErrorMessage(error),
			})
		},
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
		onError: (error, variables) => {
			logger.error('删除播放列表失败: ', flatErrorMessage(error), variables)
			toast.error('删除播放列表失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}
