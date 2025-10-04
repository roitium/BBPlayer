import { bilibiliApi } from '@/lib/api/bilibili/api'
import log from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

const logger = log.extend('Queries.SearchQueries')

export const searchQueryKeys = {
	all: ['bilibili', 'search'] as const,
	results: (query: string) =>
		[...searchQueryKeys.all, 'results', query] as const,
	hotSearches: () => [...searchQueryKeys.all, 'hotSearches'] as const,
	suggestions: (query: string) =>
		[...searchQueryKeys.all, 'suggestions', query] as const,
} as const

// 搜索结果查询
export const useSearchResults = (query: string) => {
	const enabled = query.trim().length > 0
	return useInfiniteQuery({
		queryKey: searchQueryKeys.results(query),
		queryFn: ({ pageParam = 1 }) =>
			returnOrThrowAsync(bilibiliApi.searchVideos(query, pageParam)),
		enabled,
		staleTime: 5 * 60 * 1000,
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.numPages === 0) {
				return undefined
			}
			if (lastPage.numPages === allPages.length) {
				return undefined
			}
			return allPages.length + 1
		},
	})
}

// 热门搜索查询
export const useHotSearches = () => {
	return useQuery({
		queryKey: searchQueryKeys.hotSearches(),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getHotSearches()),
		staleTime: 15 * 60 * 1000,
	})
}

// 搜索建议查询
export const useSearchSuggestions = (query: string) => {
	const enabled = query.trim().length > 0
	return useQuery({
		queryKey: searchQueryKeys.suggestions(query),
		queryFn: async () => {
			const result = await bilibiliApi.getSearchSuggestions(query)
			if (result.isErr()) {
				logger.warning('搜索建议查询失败，但无关紧要', { query })
				return []
			}
			return result.value
		},
		enabled,
		staleTime: 0,
	})
}
