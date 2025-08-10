import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export const userQueryKeys = {
	all: ['bilibili', 'user'] as const,
	personalInformation: () =>
		[...userQueryKeys.all, 'personalInformation'] as const,
	recentlyPlayed: () => [...userQueryKeys.all, 'recentlyPlayed'] as const,
	uploadedVideos: (mid: number) =>
		[...userQueryKeys.all, 'uploadedVideos', mid] as const,
	otherUserInfo: (mid: number) =>
		[...userQueryKeys.all, 'otherUserInfo', mid] as const,
}

export const usePersonalInformation = () => {
	const enabled = !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: userQueryKeys.personalInformation(),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getUserInfo()),
		staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
		enabled: enabled,
	})
}

export const useRecentlyPlayed = () => {
	const enabled = !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: userQueryKeys.recentlyPlayed(),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getHistory()),
		staleTime: 1 * 60 * 1000,
		enabled: enabled,
	})
}

export const useInfiniteGetUserUploadedVideos = (mid: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!mid
	return useInfiniteQuery({
		queryKey: userQueryKeys.uploadedVideos(mid),
		queryFn: ({ pageParam }) =>
			returnOrThrowAsync(bilibiliApi.getUserUploadedVideos(mid, pageParam)),
		getNextPageParam: (lastPage) => {
			const nowLoaded = lastPage.page.pn * lastPage.page.ps
			if (nowLoaded >= lastPage.page.count) {
				return undefined
			}
			return lastPage.page.pn + 1
		},
		initialPageParam: 1,
		staleTime: 1,
		enabled: enabled,
	})
}

export const useOtherUserInfo = (mid: number) => {
	const enabled = !!appStore.getState().bilibiliCookieString && !!mid
	return useQuery({
		queryKey: userQueryKeys.otherUserInfo(mid),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getOtherUserInfo(mid)),
		staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
		enabled: enabled,
	})
}
