import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'
import { throwResultAsync } from '@/utils/neverthrowUtils'

export const videoDataQueryKeys = {
  all: ['videoData'] as const,
  getMultiPageList: (bvid: string) =>
    [...videoDataQueryKeys.all, 'getMultiPageList', bvid] as const,
  getVideoDetails: (bvid: string) =>
    [...videoDataQueryKeys.all, 'getVideoDetails', bvid] as const,
} as const

/**
 * 获取分P列表
 */
export const useGetMultiPageList = (bvid: string, bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: videoDataQueryKeys.getMultiPageList(bvid),
    queryFn: () => throwResultAsync(bilibiliApi.getPageList(bvid)),
    staleTime: 1,
    enabled: !!bilibiliApi.getCookie(), // 依赖 bilibiliApi
  })
}

/**
 * 获取视频详细信息
 */
export const useGetVideoDetails = (bvid: string, bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: videoDataQueryKeys.getVideoDetails(bvid),
    queryFn: () => throwResultAsync(bilibiliApi.getVideoDetails(bvid)),
    staleTime: 1,
    enabled: !!bilibiliApi.getCookie(), // 依赖 bilibiliApi
  })
}
