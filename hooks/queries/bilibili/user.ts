import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'

export const userQueryKeys = {
	all: ['bilibili', 'user'] as const,
	personalInformation: () =>
		[...userQueryKeys.all, 'personalInformation'] as const,
	recentlyPlayed: () => [...userQueryKeys.all, 'recentlyPlayed'] as const,
	uploadedVideos: (mid: number, keyword?: string) =>
		[...userQueryKeys.all, 'uploadedVideos', mid, keyword ?? ''] as const,
	otherUserInfo: (mid: number) =>
		[...userQueryKeys.all, 'otherUserInfo', mid] as const,
}

export const usePersonalInformation = () => {
	const enabled = appStore.getState().hasBilibiliCookie()
	return useQuery({
		queryKey: userQueryKeys.personalInformation(),
		queryFn: enabled
			? () => returnOrThrowAsync(bilibiliApi.getUserInfo())
			: skipToken,
		staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
	})
}

export const useRecentlyPlayed = () => {
	const enabled = appStore.getState().hasBilibiliCookie()
	return useQuery({
		queryKey: userQueryKeys.recentlyPlayed(),
		queryFn: enabled
			? () => returnOrThrowAsync(bilibiliApi.getHistory())
			: skipToken,
		staleTime: 1 * 60 * 1000,
	})
}

export const useInfiniteGetUserUploadedVideos = (
	mid: number,
	keyword?: string,
) => {
	const enabled = !!mid
	return useInfiniteQuery({
		queryKey: userQueryKeys.uploadedVideos(mid, keyword),
		queryFn: enabled
			? ({ pageParam }) =>
					returnOrThrowAsync(
						bilibiliApi.getUserUploadedVideos(mid, pageParam, keyword),
					)
			: skipToken,
		getNextPageParam: (lastPage) => {
			const nowLoaded = lastPage.page.pn * lastPage.page.ps
			if (nowLoaded >= lastPage.page.count) {
				return undefined
			}
			return lastPage.page.pn + 1
		},
		initialPageParam: 1,
		staleTime: 1,
	})
}

export const useOtherUserInfo = (mid: number) => {
	const enabled = !!mid
	return useQuery({
		queryKey: userQueryKeys.otherUserInfo(mid),
		queryFn: enabled
			? () => returnOrThrowAsync(bilibiliApi.getOtherUserInfo(mid))
			: skipToken,
		staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
	})
}
