import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'
import { BilibiliApiError, CsrfError } from '@/utils/errors'
import { showToast } from '@/utils/toast'
import { throwResultAsync } from '@/utils/neverthrowUtils'
import log from '@/utils/log'

const favoriteListLog = log.extend('QUERIES/FAVORITE')

export const favoriteListQueryKeys = {
  all: ['favoriteList'] as const,
  infiniteFavoriteList: (favoriteId: number) =>
    [...favoriteListQueryKeys.all, 'infiniteFavoriteList', favoriteId] as const,
  allFavoriteList: () =>
    [...favoriteListQueryKeys.all, 'allFavoriteList'] as const,
  infiniteCollectionList: (mid: number) =>
    [...favoriteListQueryKeys.all, 'infiniteCollectionList', mid] as const,
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
      throwResultAsync(
        bilibiliApi.getFavoriteListContents(favoriteId, pageParam),
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
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
    queryFn: () =>
      throwResultAsync(bilibiliApi.getFavoritePlaylists(userMid as number)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userMid, // 依赖 userMid
  })
}

/**
 * 删除收藏夹内容
 */
export const useBatchDeleteFavoriteListContents = (
  bilibiliApi: BilibiliApi,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { bvids: string[]; favoriteId: number }) =>
      throwResultAsync(
        bilibiliApi.batchDeleteFavoriteListContents(
          params.favoriteId,
          params.bvids,
        ),
      ),
    onSuccess: (_data, variables) => {
      showToast({
        severity: 'success',
        title: '删除成功',
      })
      queryClient.invalidateQueries({
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

      showToast({
        severity: 'error',
        title: '操作失败',
        message: errorMessage,
      })
      favoriteListLog.error('删除收藏夹内容失败:', error)
    },
  })
}

/**
 * 获取追更合集列表（分页）
 */
export const useInfiniteCollectionsList = (
  bilibiliApi: BilibiliApi,
  mid: number,
) => {
  return useInfiniteQuery({
    queryKey: favoriteListQueryKeys.infiniteCollectionList(mid),
    queryFn: ({ pageParam }) =>
      throwResultAsync(bilibiliApi.getCollectionsList(pageParam, mid)),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    staleTime: 1,
    enabled: !!mid, // 依赖 mid
  })
}
