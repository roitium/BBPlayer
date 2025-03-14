import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'

export const searchQueryKeys = {
  all: ['search'] as const,
  results: (query: string, page: number, pageSize: number) =>
    [...searchQueryKeys.all, 'results', query, page, pageSize] as const,
  hotSearches: () => [...searchQueryKeys.all, 'hotSearches'] as const,
} as const

// 搜索结果查询
export const useSearchResults = (
  query: string,
  page: number,
  page_size: number,
  bilibiliApi: BilibiliApi,
) => {
  return useQuery({
    queryKey: searchQueryKeys.results(query, page, page_size),
    queryFn: () => bilibiliApi.searchVideos(query, page, page_size),
    staleTime: 5 * 60 * 1000, // 5分钟
    enabled: query.trim().length > 0, // 只有当查询不为空时才启用
  })
}

// 热门搜索查询
export const useHotSearches = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: searchQueryKeys.hotSearches(),
    queryFn: () => bilibiliApi.getHotSearches(),
    staleTime: 15 * 60 * 1000, // 15分钟
  })
}
