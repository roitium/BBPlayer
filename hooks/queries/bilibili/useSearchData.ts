import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'

export const searchQueryKeys = {
  all: ['search', 'bilibili'] as const,
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
    queryFn: () =>
      returnOrThrowAsync(bilibiliApi.searchVideos(query, page, page_size)),
    staleTime: 5 * 60 * 1000,
    enabled: query.trim().length > 0 && !!bilibiliApi.getCookie(), // 依赖 bilibiliApi，且搜索关键词不为空
  })
}

// 热门搜索查询
export const useHotSearches = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: searchQueryKeys.hotSearches(),
    queryFn: () => returnOrThrowAsync(bilibiliApi.getHotSearches()),
    staleTime: 15 * 60 * 1000,
    enabled: !!bilibiliApi.getCookie(), // 依赖 bilibiliApi
  })
}
