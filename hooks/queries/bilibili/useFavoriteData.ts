import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { BilibiliApiError, CsrfError } from '@/utils/errors'
import log from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import toast from '@/utils/toast'
import {
	skipToken,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'

const favoriteListLog = log.extend('QUERIES/FAVORITE')

export const favoriteListQueryKeys = {
	all: ['bilibili', 'favoriteList'] as const,
	infiniteFavoriteList: (favoriteId?: number) =>
		[...favoriteListQueryKeys.all, 'infiniteFavoriteList', favoriteId] as const,
	allFavoriteList: (userMid?: number) =>
		[...favoriteListQueryKeys.all, 'allFavoriteList', userMid] as const,
	infiniteCollectionList: (mid?: number) =>
		[...favoriteListQueryKeys.all, 'infiniteCollectionList', mid] as const,
	collectionAllContents: (collectionId: number) =>
		[
			...favoriteListQueryKeys.all,
			'collectionAllContents',
			collectionId,
		] as const,
	favoriteForOneVideo: (bvid: string, userMid?: number) =>
		[
			...favoriteListQueryKeys.all,
			'favoriteForOneVideo',
			bvid,
			userMid,
		] as const,
	infiniteSearchFavoriteItems: (
		scope: 'all' | 'this',
		keyword?: string,
		favoriteId?: number,
	) => {
		switch (scope) {
			case 'all':
				return [
					...favoriteListQueryKeys.all,
					'infiniteSearchFavoriteItems',
					keyword,
				] as const
			case 'this':
				return [
					...favoriteListQueryKeys.all,
					'infiniteSearchFavoriteItems',
					keyword,
					favoriteId,
				] as const
		}
	},
} as const

/**
 * 获取某个收藏夹的内容（无限滚动）
 * @param bilibiliApi
 * @param favoriteId
 */
export const useInfiniteFavoriteList = (favoriteId?: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteFavoriteList(favoriteId),
		queryFn: favoriteId
			? ({ pageParam }) =>
					returnOrThrowAsync(
						bilibiliApi.getFavoriteListContents(
							favoriteId as number,
							pageParam,
						),
					)
			: skipToken,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.hasMore ? lastPageParam + 1 : undefined,
		staleTime: 5 * 60 * 1000,
		enabled: enabled,
	})
}

/**
 * 获取收藏夹列表
 * @param bilibiliApi
 * @param userMid
 */
export const useGetFavoritePlaylists = (userMid?: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!userMid
	return useQuery({
		queryKey: favoriteListQueryKeys.allFavoriteList(userMid),
		queryFn: userMid
			? () => returnOrThrowAsync(bilibiliApi.getFavoritePlaylists(userMid))
			: skipToken,
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: enabled,
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
		onSuccess: (_data, variables) => {
			toast.success('删除成功')
			queryClient.refetchQueries({
				queryKey: favoriteListQueryKeys.infiniteFavoriteList(
					variables.favoriteId,
				),
			})
		},
		onError: (error) => {
			let errorMessage = '删除失败，请稍后重试'
			if (error instanceof CsrfError) {
				errorMessage = '删除失败：安全验证过期，请检查 cookie 后重试'
			} else if (error instanceof BilibiliApiError) {
				errorMessage = `删除失败：${error.message} (${error.msgCode})`
			}

			toast.error('操作失败', {
				description: errorMessage,
				duration: Number.POSITIVE_INFINITY,
			})
			favoriteListLog.error('删除收藏夹内容失败:', error)
		},
	})
}

/**
 * 获取追更合集列表（分页）
 */
export const useInfiniteCollectionsList = (mid?: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!mid
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteCollectionList(mid),
		queryFn: mid
			? ({ pageParam }) =>
					returnOrThrowAsync(bilibiliApi.getCollectionsList(pageParam, mid))
			: skipToken,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.hasMore ? lastPageParam + 1 : undefined,
		staleTime: 1,
		enabled: enabled,
	})
}

/**
 * 获取合集详细信息和完整内容
 */
export const useCollectionAllContents = (collectionId: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: favoriteListQueryKeys.collectionAllContents(collectionId),
		queryFn: () =>
			returnOrThrowAsync(bilibiliApi.getCollectionAllContents(collectionId)),
		staleTime: 1,
		enabled: enabled,
	})
}

/**
 * 获取包含指定视频的收藏夹列表
 */
export const useGetFavoriteForOneVideo = (bvid: string, userMid?: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!userMid
	return useQuery({
		queryKey: favoriteListQueryKeys.favoriteForOneVideo(bvid, userMid),
		queryFn: userMid
			? () =>
					returnOrThrowAsync(
						bilibiliApi.getTargetVideoFavoriteStatus(userMid, bvid),
					)
			: skipToken,
		staleTime: 1,
		enabled: enabled,
	})
}

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
		onSuccess: (_data, _value) => {
			toast.success('操作成功', {
				description:
					_data.toast_msg.length > 0
						? `api 返回消息：${_data.toast_msg}`
						: undefined,
			})
			// 只刷新当前显示的收藏夹
			queryClient.refetchQueries({
				queryKey: ['bilibili', 'favoriteList', 'infiniteFavoriteList'],
				type: 'active',
			})
		},
		onError: (error) => {
			let errorMessage = '删除失败，请稍后重试'
			if (error instanceof CsrfError) {
				errorMessage = '删除失败：安全验证过期，请检查 cookie 后重试'
			} else if (error instanceof BilibiliApiError) {
				errorMessage = `删除失败：${error.message} (${error.msgCode})`
			}

			toast.error('操作失败', {
				description: errorMessage,
				duration: Number.POSITIVE_INFINITY,
			})
			favoriteListLog.error('删除收藏夹内容失败:', error)
		},
	})
}

/**
 * 在所有收藏夹中搜索关键字
 */
export const useInfiniteSearchFavoriteItems = (
	scope: 'all' | 'this',
	keyword?: string,
	favoriteId?: number,
) => {
	const enabled =
		!!keyword &&
		keyword.trim().length > 0 &&
		!!appStore.getState().bilibiliCookieString &&
		!!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteSearchFavoriteItems(
			scope,
			keyword,
			favoriteId,
		),
		queryFn:
			keyword && favoriteId
				? ({ pageParam }) =>
						returnOrThrowAsync(
							bilibiliApi.searchFavoriteListContents(
								favoriteId,
								scope,
								pageParam,
								keyword,
							),
						)
				: skipToken,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.hasMore ? lastPageParam + 1 : undefined,
		staleTime: 1,
		enabled: enabled,
	})
}
