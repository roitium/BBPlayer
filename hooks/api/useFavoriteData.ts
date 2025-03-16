import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'

export const useFavoriteData = (
  bilibiliApi: BilibiliApi,
  favoriteId: number,
  page: number,
) => {
  return useQuery({
    queryKey: ['favoriteData', favoriteId, page],
    queryFn: () => bilibiliApi.getFavoriteListContents(favoriteId, page),
    staleTime: 1,
  })
}
