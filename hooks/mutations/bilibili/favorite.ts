import { favoriteListQueryKeys } from '@/hooks/queries/bilibili/favorite'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import log, { toastAndLogError } from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import toast from '@/utils/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const logger = log.extend('Mutation.Bilibili.Favorite')

/**
 * 单个视频添加/删除到多个收藏夹
 */
export const useDealFavoriteForOneVideo = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: {
			bvid: string
			addToFavoriteIds: string[]
			delInFavoriteIds: string[]
		}) =>
			await returnOrThrowAsync(
				bilibiliApi.dealFavoriteForOneVideo(
					params.bvid,
					params.addToFavoriteIds,
					params.delInFavoriteIds,
				),
			),
		onSuccess: async (_data, _value) => {
			toast.success('操作成功', {
				description:
					_data.toast_msg.length > 0
						? `api 返回消息：${_data.toast_msg}`
						: undefined,
			})
			// 只刷新当前显示的收藏夹
			await queryClient.refetchQueries({
				queryKey: ['bilibili', 'favoriteList', 'infiniteFavoriteList'],
				type: 'active',
			})
		},
		onError: (error) => {
			let errorMessage = '删除失败，请稍后重试'
			if (error instanceof BilibiliApiError) {
				if (error.type === 'CsrfError') {
					errorMessage = '删除失败：csrf token 过期，请检查 cookie 后重试'
				} else {
					errorMessage = `删除失败：${error.message} (${error.data.msgCode})`
				}
			}

			toast.error('操作失败', {
				description: errorMessage,
				duration: Number.POSITIVE_INFINITY,
			})
			logger.error('删除收藏夹内容失败:', error)
		},
	})
}

/**
 * 删除收藏夹内容
 */
export const useBatchDeleteFavoriteListContents = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (params: { bvids: string[]; favoriteId: number }) =>
			returnOrThrowAsync(
				bilibiliApi.batchDeleteFavoriteListContents(
					params.favoriteId,
					params.bvids,
				),
			),
		onSuccess: async (_data, variables) => {
			toast.success('删除成功')
			await queryClient.refetchQueries({
				queryKey: favoriteListQueryKeys.infiniteFavoriteList(
					variables.favoriteId,
				),
			})
		},
		onError: (error) => {
			let errorMessage = '删除失败，请稍后重试'
			if (error instanceof BilibiliApiError) {
				if (error.type === 'CsrfError') {
					errorMessage = '删除失败：csrf token 过期，请检查 cookie 后重试'
				} else {
					errorMessage = `删除失败：${error.message} (${error.data.msgCode})`
				}
			}

			toastAndLogError(errorMessage, error, 'Query.Bilibili.Favorite')
		},
	})
}
