import { useQuery } from '@tanstack/react-query'
import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'

export const searchQueryKeys = {
	all: ['bilibili', 'search'] as const,
	results: (query: string, page: number, pageSize: number) =>
		[...searchQueryKeys.all, 'results', query, page, pageSize] as const,
	hotSearches: () => [...searchQueryKeys.all, 'hotSearches'] as const,
} as const

// 搜索结果查询
export const useSearchResults = (
	query: string,
	page: number,
	page_size: number,
) => {
	const enabled =
		query.trim().length > 0 && !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: searchQueryKeys.results(query, page, page_size),
		queryFn: () =>
			returnOrThrowAsync(bilibiliApi.searchVideos(query, page, page_size)),
		staleTime: 5 * 60 * 1000,
		enabled: enabled,
	})
}

// 热门搜索查询
export const useHotSearches = () => {
	const enabled = !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: searchQueryKeys.hotSearches(),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getHotSearches()),
		staleTime: 15 * 60 * 1000,
		enabled: enabled,
	})
}
