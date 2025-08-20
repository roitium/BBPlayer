import { bilibiliApi } from '@/lib/api/bilibili/api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import { useQuery } from '@tanstack/react-query'

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
export const useGetMultiPageList = (bvid: string | undefined) => {
	const enabled = !!bvid
	return useQuery({
		queryKey: videoDataQueryKeys.getMultiPageList(bvid),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getPageList(bvid!)),
		enabled,
		staleTime: 1,
	})
}

/**
 * 获取视频详细信息
 */
export const useGetVideoDetails = (bvid: string | undefined) => {
	const enabled = !!bvid
	return useQuery({
		queryKey: videoDataQueryKeys.getVideoDetails(bvid),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getVideoDetails(bvid!)),
		enabled,
		staleTime: 60 * 60 * 1000, // 我们不需要获取实时的视频详细信息
	})
}
