import { playlistKeys } from '@/hooks/queries/db/usePlaylist'
import { queryClient } from '@/lib/config/queryClient'
import db from '@/lib/db/db'
import { playlistFacade } from '@/lib/facades/playlist'
import { syncFacade } from '@/lib/facades/sync'
import { playlistService } from '@/lib/services/playlistService'
import type { Playlist } from '@/types/core/media'
import type { UpdatePlaylistPayload } from '@/types/services/playlist'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'

const logger = log.extend('mutations/db/playlist')

export const usePlaylistSync = () => {
	return useMutation({
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
		onError: (error, variables) => {
			logger.error('操作音频收藏位置失败: ', flatErrorMessage(error), variables)
			toast.error('操作音频收藏位置失败', {
				description: flatErrorMessage(error),
			})
		},
	})
}

export const useCopyRemotePlaylistToLocalPlaylist = () => {
	return useMutation({
		mutationFn: async ({ playlistId }: { playlistId: number }) => {
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
		mutationFn: async ({
			playlistId,
			payload,
		}: {
			playlistId: number
			payload: UpdatePlaylistPayload
		}) => {
			if (playlistId === 0) return
			const result = await playlistService.updateLocalPlaylist(
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
