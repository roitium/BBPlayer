import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
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

/**
 * 获取收藏夹列表
 * @param bilibiliApi
 * @param userMid
 */
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

/**
 * 删除收藏夹内容
 */
export const useBatchDeleteFavoriteListContents = (
  bilibiliApi: BilibiliApi,
  queryClient: QueryClient,
) => {
  return useMutation({
    mutationFn: (params: { bvids: string[]; favoriteId: number }) =>
      bilibiliApi.batchDeleteFavoriteListContents(
        params.favoriteId,
        params.bvids,
      ),
    onSuccess: (data, variables) =>
      queryClient.refetchQueries({
        queryKey: favoriteListQueryKeys.infiniteFavoriteList(
          variables.favoriteId,
        ), // 刷新收藏夹内容
      }),
  })
}
