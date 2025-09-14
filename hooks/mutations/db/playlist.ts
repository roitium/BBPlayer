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

const SCOPE = 'Mutation.DB.Playlist'

queryClient.setMutationDefaults(['db', 'playlist'], {
	retry: false,
})

// React Query 的 invalidateQueries 会直接在后台刷新当前页面活跃的查询，能满足咱们的需求。
// 只有当我们需要在 mutate 之后要跳转到另一个页面时，才需要去 invalidateQueries
export const usePlaylistSync = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'sync'],
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
		onSuccess: async (id) => {
			toast.success('同步成功')
			if (!id) return
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistContents(id),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(id),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
			])
		},
		onError: (error, { remoteSyncId, type }) =>
			toastAndLogError(
				`同步播放列表失败: remoteSyncId=${remoteSyncId}, type=${type}`,
				error,
				SCOPE,
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
		mutationKey: ['db', 'playlist', 'updateTrackLocalPlaylists'],
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
		onSuccess: async (trackId, { toAddPlaylistIds, toRemovePlaylistIds }) => {
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
			await Promise.all(promises)
		},
		onError: (error, { trackPayload }) =>
			toastAndLogError(
				`操作音频收藏位置失败: trackTitle=${trackPayload.title}`,
				error,
				SCOPE,
			),
	})
}

export const useDuplicatePlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'duplicatePlaylist'],
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
		onSuccess: async () => {
			toast.success('复制成功')
			await queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistLists(),
			})
		},
		onError: (error, { playlistId, name }) =>
			toastAndLogError(
				`复制播放列表失败: playlistId=${playlistId}, name=${name}`,
				error,
				SCOPE,
			),
	})
}

export const useEditPlaylistMetadata = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'editPlaylistMetadata'],
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
		onSuccess: async (_, variables) => {
			toast.success('操作成功')
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(variables.playlistId),
				}),
			])
		},
		onError: (error, { playlistId }) =>
			toastAndLogError(
				`修改播放列表信息失败：playlistId=${playlistId}`,
				error,
				SCOPE,
			),
	})
}

export const useDeletePlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'deletePlaylist'],
		mutationFn: async ({ playlistId }: { playlistId: number }) => {
			const result = await playlistService.deletePlaylist(playlistId)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: async () => {
			toast.success('删除成功')
			await queryClient.invalidateQueries({
				queryKey: playlistKeys.playlistLists(),
			})
		},
		onError: (error, { playlistId }) =>
			toastAndLogError(
				`删除播放列表失败: playlistId=${playlistId}`,
				error,
				SCOPE,
			),
	})
}

export const useBatchDeleteTracksFromLocalPlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'batchDeleteTracksFromLocalPlaylist'],
		mutationFn: async ({
			trackIds,
			playlistId,
		}: {
			trackIds: number[]
			playlistId: number
		}) => {
			const result = await playlistService.batchRemoveTracksFromLocalPlaylist(
				playlistId,
				trackIds,
			)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: async (data, variables) => {
			toast.success('删除成功', {
				description:
					data.missingTrackIds.length !== 0
						? `但缺少了: ${data.missingTrackIds.toString()} (理论来说不应该出现此错误)`
						: undefined,
			})
			const promises = [
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistContents(variables.playlistId),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(variables.playlistId),
				}),
			]
			for (const id of data.removedTrackIds) {
				promises.push(
					queryClient.invalidateQueries({
						queryKey: playlistKeys.playlistsContainingTrack(id),
					}),
				)
			}
			await Promise.all(promises)
		},
		onError: (error) =>
			toastAndLogError('从播放列表中删除 track 失败', error, SCOPE),
	})
}

export const useCreateNewLocalPlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'createNewLocalPlaylist'],
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
		onSuccess: async (playlist) => {
			toast.success('创建播放列表成功')
			await Promise.all([
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
		onError: (error) => toastAndLogError('创建播放列表失败', error, SCOPE),
	})
}

/**
 * 批量添加 tracks 到本地播放列表
 * @param playlistId
 * @param payloads 应包含 track 和 artist，**artist 只能为 remote 来源**
 * @returns
 */
export const useBatchAddTracksToLocalPlaylist = () => {
	return useMutation({
		mutationKey: ['db', 'playlist', 'batchAddTracksToLocalPlaylist'],
		mutationFn: async ({
			playlistId,
			payloads,
		}: {
			playlistId: number
			payloads: { track: CreateTrackPayload; artist: CreateArtistPayload }[]
		}) => {
			const result = await playlistFacade.batchAddTracksToLocalPlaylist(
				playlistId,
				payloads,
			)
			if (result.isErr()) throw result.error
			return result.value
		},
		onSuccess: async (trackIds, { playlistId }) => {
			toast.success('添加成功')
			const promises = [
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistLists(),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistContents(playlistId),
				}),
				queryClient.invalidateQueries({
					queryKey: playlistKeys.playlistMetadata(playlistId),
				}),
			]
			for (const id of trackIds) {
				promises.push(
					queryClient.invalidateQueries({
						queryKey: playlistKeys.playlistsContainingTrack(id),
					}),
				)
			}
			await Promise.all(promises)
		},
		onError: (error) =>
			toastAndLogError('批量添加歌曲到播放列表失败', error, SCOPE),
	})
}
