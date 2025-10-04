import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import { useQuery } from '@tanstack/react-query'

export const videoDataQueryKeys = {
	all: ['bilibili', 'videoData'] as const,
	getMultiPageList: (bvid?: string) =>
		[...videoDataQueryKeys.all, 'getMultiPageList', bvid] as const,
	getVideoDetails: (bvid?: string) =>
		[...videoDataQueryKeys.all, 'getVideoDetails', bvid] as const,
	getVideoIsThumbUp: (bvid?: string) =>
		[...videoDataQueryKeys.all, 'getVideoIsThumbUp', bvid] as const,
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

/**
 * 检查视频是否已经点赞
 */
export const useGetVideoIsThumbUp = (bvid: string | undefined) => {
	const hasCookie = useAppStore((s) => s.hasBilibiliCookie())
	const enabled = !!bvid && hasCookie
	return useQuery({
		queryKey: videoDataQueryKeys.getVideoIsThumbUp(bvid),
		queryFn: () => returnOrThrowAsync(bilibiliApi.checkVideoIsThumbUp(bvid!)),
		enabled,
		staleTime: 0,
	})
}
