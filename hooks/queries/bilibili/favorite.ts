import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { BilibiliApiError, BilibiliApiErrorType } from '@/lib/errors/bilibili'
import { toastAndLogError } from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import toast from '@/utils/toast'
import {
	skipToken,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'

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
	const enabled = appStore.getState().hasBilibiliCookie() && !!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteFavoriteList(favoriteId),
		queryFn: enabled
			? ({ pageParam }) =>
					returnOrThrowAsync(
						bilibiliApi.getFavoriteListContents(favoriteId, pageParam),
					)
			: skipToken,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.has_more ? lastPageParam + 1 : undefined,
		staleTime: 5 * 60 * 1000,
	})
}

/**
 * 获取收藏夹列表
 * @param bilibiliApi
 * @param userMid
 */
export const useGetFavoritePlaylists = (userMid?: number) => {
	const enabled = appStore.getState().hasBilibiliCookie() && !!userMid
	return useQuery({
		queryKey: favoriteListQueryKeys.allFavoriteList(userMid),
		queryFn: enabled
			? () => returnOrThrowAsync(bilibiliApi.getFavoritePlaylists(userMid))
			: skipToken,
		staleTime: 5 * 60 * 1000, // 5 minutes
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
				if (error.type === BilibiliApiErrorType.CsrfError) {
					errorMessage = '删除失败：csrf token 过期，请检查 cookie 后重试'
				} else {
					errorMessage = `删除失败：${error.message} (${error.msgCode})`
				}
			}

			toastAndLogError(errorMessage, error, 'Query.Bilibili.Favorite')
		},
	})
}

/**
 * 获取追更合集列表（分页）
 */
export const useInfiniteCollectionsList = (mid?: number) => {
	const enabled = appStore.getState().hasBilibiliCookie() && !!mid
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteCollectionList(mid),
		queryFn: enabled
			? ({ pageParam }) =>
					returnOrThrowAsync(bilibiliApi.getCollectionsList(pageParam, mid))
			: skipToken,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.hasMore ? lastPageParam + 1 : undefined,
		staleTime: 1,
	})
}

/**
 * 获取合集详细信息和完整内容
 * (非登录可访问)
 */
export const useCollectionAllContents = (collectionId: number) => {
	return useQuery({
		queryKey: favoriteListQueryKeys.collectionAllContents(collectionId),
		queryFn: () =>
			returnOrThrowAsync(bilibiliApi.getCollectionAllContents(collectionId)),
		staleTime: 1,
	})
}

/**
 * 获取包含指定视频的收藏夹列表
 */
export const useGetFavoriteForOneVideo = (bvid: string, userMid?: number) => {
	const enabled =
		appStore.getState().hasBilibiliCookie() && !!userMid && bvid.length > 0
	return useQuery({
		queryKey: favoriteListQueryKeys.favoriteForOneVideo(bvid, userMid),
		queryFn: enabled
			? () =>
					returnOrThrowAsync(
						bilibiliApi.getTargetVideoFavoriteStatus(userMid, bvid),
					)
			: skipToken,
		staleTime: 0,
		gcTime: 0,
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
		appStore.getState().hasBilibiliCookie() &&
		!!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteSearchFavoriteItems(
			scope,
			keyword,
			favoriteId,
		),
		queryFn: enabled
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
			lastPage.has_more ? lastPageParam + 1 : undefined,
		staleTime: 1,
	})
}
