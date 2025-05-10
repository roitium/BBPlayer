import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { BilibiliApiError, CsrfError } from '@/utils/errors'
import log from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import Toast from '@/utils/toast'

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
export const useInfiniteFavoriteList = (
  bilibiliApi: BilibiliApi,
  favoriteId?: number,
) => {
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
    staleTime: 5*60*1000,
    enabled: !!favoriteId && !!bilibiliApi.getCookie(), // 依赖 favoriteId 和 bilibiliApi
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
    queryKey: favoriteListQueryKeys.allFavoriteList(userMid),
    queryFn: userMid
      ? () => returnOrThrowAsync(bilibiliApi.getFavoritePlaylists(userMid))
      : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userMid && !!bilibiliApi.getCookie(), // 依赖 userMid 和 bilibiliApi
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
      returnOrThrowAsync(
        bilibiliApi.batchDeleteFavoriteListContents(
          params.favoriteId,
          params.bvids,
        ),
      ),
    onSuccess: (_data, variables) => {
      Toast.success('删除成功')
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

      Toast.error('操作失败', {
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
export const useInfiniteCollectionsList = (
  bilibiliApi: BilibiliApi,
  mid?: number,
) => {
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
    enabled: !!mid && !!bilibiliApi.getCookie(), // 依赖 mid 和 bilibiliApi
  })
}

/**
 * 获取合集详细信息和完整内容
 */
export const useCollectionAllContents = (
  bilibiliApi: BilibiliApi,
  collectionId: number,
) => {
  return useQuery({
    queryKey: favoriteListQueryKeys.collectionAllContents(collectionId),
    queryFn: () =>
      returnOrThrowAsync(bilibiliApi.getCollectionAllContents(collectionId)),
    staleTime: 1,
    enabled: !!bilibiliApi.getCookie(), // 依赖 bilibiliApi
  })
}

/**
 * 获取包含指定视频的收藏夹列表
 */
export const useGetFavoriteForOneVideo = (
  bilibiliApi: BilibiliApi,
  bvid: string,
  userMid?: number,
) => {
  return useQuery({
    queryKey: favoriteListQueryKeys.favoriteForOneVideo(bvid, userMid),
    queryFn: userMid
      ? () =>
          returnOrThrowAsync(
            bilibiliApi.getTargetVideoFavoriteStatus(userMid, bvid),
          )
      : skipToken,
    staleTime: 1,
    enabled: !!bilibiliApi.getCookie() && !!userMid, // 依赖 bilibiliApi 和 userMid
  })
}

/**
 * 单个视频添加/删除到多个收藏夹
 */
export const useDealFavoriteForOneVideo = (bilibiliApi: BilibiliApi) => {
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
      Toast.success('操作成功', {
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

      Toast.error('操作失败', {
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
  bilibiliApi: BilibiliApi,
  scope: 'all' | 'this',
  keyword?: string,
  favoriteId?: number,
) => {
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
    enabled:
      !!keyword &&
      keyword.trim().length > 0 &&
      !!bilibiliApi.getCookie() &&
      !!favoriteId,
  })
}
