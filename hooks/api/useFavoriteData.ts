import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'

export const favoriteListQueryKeys = {
  all: ['favoriteList'] as const,
  infiniteFavoriteList: (favoriteId: number) =>
    [...favoriteListQueryKeys.all, 'infiniteFavoriteList', favoriteId] as const,
  allFavoriteList: () =>
    [...favoriteListQueryKeys.all, 'allFavoriteList'] as const,
} as const

/**
 * 获取某个收藏夹的内容（无限滚动）
 * @param bilibiliApi
 * @param favoriteId
 */
export const useInfiniteFavoriteList = (
  bilibiliApi: BilibiliApi,
  favoriteId: number,
) => {
  return useInfiniteQuery({
    queryKey: favoriteListQueryKeys.infiniteFavoriteList(favoriteId),
    queryFn: ({ pageParam }) =>
      bilibiliApi.getFavoriteListContents(favoriteId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    staleTime: 1,
  })
}

export const useGetFavoritePlaylists = (
  bilibiliApi: BilibiliApi,
  userMid?: number,
) => {
  return useQuery({
    queryKey: favoriteListQueryKeys.allFavoriteList(),
    queryFn: () => bilibiliApi.getFavoritePlaylists(userMid as number), // 这里需要断言，因为下面的enabled依赖于userMid
    staleTime: 5 * 60 * 1000,
    enabled: !!userMid,
  })
}
