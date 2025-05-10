import { skipToken, useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'

export const videoDataQueryKeys = {
  all: ['bilibili', 'videoData'] as const,
  getMultiPageList: (bvid?: string) =>
    [...videoDataQueryKeys.all, 'getMultiPageList', bvid] as const,
  getVideoDetails: (bvid?: string) =>
    [...videoDataQueryKeys.all, 'getVideoDetails', bvid] as const,
} as const

/**
 * 获取分P列表
 */
export const useGetMultiPageList = (
  bvid: string | undefined,
  bilibiliApi: BilibiliApi,
) => {
  return useQuery({
    queryKey: videoDataQueryKeys.getMultiPageList(bvid),
    queryFn: bvid
      ? () => returnOrThrowAsync(bilibiliApi.getPageList(bvid))
      : skipToken,
    staleTime: 1,
    enabled: !!bilibiliApi.getCookie() && !!bvid, // 依赖 bilibiliApi 和 bvid
  })
}

/**
 * 获取视频详细信息
 */
export const useGetVideoDetails = (
  bvid: string | undefined,
  bilibiliApi: BilibiliApi,
) => {
  return useQuery({
    queryKey: videoDataQueryKeys.getVideoDetails(bvid),
    queryFn: bvid
      ? () => returnOrThrowAsync(bilibiliApi.getVideoDetails(bvid))
      : skipToken,
    staleTime: 60 * 60 * 1000, // 我们不需要获取实时的视频详细信息
    enabled: !!bilibiliApi.getCookie() && !!bvid, // 依赖 bilibiliApi 和 bvid
  })
}
