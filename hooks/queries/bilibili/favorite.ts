import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

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

const useHasCookie = () => useAppStore((s) => s.hasBilibiliCookie())

/**
 * 获取某个收藏夹的内容（无限滚动）
 * @param bilibiliApi
 * @param favoriteId
 */
export const useInfiniteFavoriteList = (favoriteId?: number) => {
	const hasCookie = useHasCookie()
	const enabled = hasCookie && !!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteFavoriteList(favoriteId),
		queryFn: ({ pageParam }) =>
			returnOrThrowAsync(
				bilibiliApi.getFavoriteListContents(favoriteId!, pageParam),
			),
		enabled,
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
	const hasCookie = useHasCookie()
	const enabled = hasCookie && !!userMid
	return useQuery({
		queryKey: favoriteListQueryKeys.allFavoriteList(userMid),
		queryFn: () =>
			returnOrThrowAsync(bilibiliApi.getFavoritePlaylists(userMid!)),
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
	})
}

/**
 * 获取追更合集列表（分页）
 */
export const useInfiniteCollectionsList = (mid?: number) => {
	const hasCookie = useHasCookie()
	const enabled = hasCookie && !!mid
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteCollectionList(mid),
		queryFn: ({ pageParam }) =>
			returnOrThrowAsync(bilibiliApi.getCollectionsList(pageParam, mid!)),
		enabled,
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
	const hasCookie = useHasCookie()
	const enabled = hasCookie && !!userMid && bvid.length > 0
	return useQuery({
		queryKey: favoriteListQueryKeys.favoriteForOneVideo(bvid, userMid),
		queryFn: () =>
			returnOrThrowAsync(
				bilibiliApi.getTargetVideoFavoriteStatus(userMid!, bvid),
			),
		enabled,
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
	const hasCookie = useHasCookie()
	const enabled =
		!!keyword && keyword.trim().length > 0 && hasCookie && !!favoriteId
	return useInfiniteQuery({
		queryKey: favoriteListQueryKeys.infiniteSearchFavoriteItems(
			scope,
			keyword,
			favoriteId,
		),
		queryFn: ({ pageParam }) =>
			returnOrThrowAsync(
				bilibiliApi.searchFavoriteListContents(
					favoriteId!,
					scope,
					pageParam,
					keyword!,
				),
			),
		enabled,
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.has_more ? lastPageParam + 1 : undefined,
		staleTime: 1,
	})
}
