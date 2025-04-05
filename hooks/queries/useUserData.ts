import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'
import { useQuery } from '@tanstack/react-query'

const userQueryKeys = {
  all: ['user'] as const,
  personalInformation: () =>
    [...userQueryKeys.all, 'personalInformation'] as const,
  recentlyPlayed: () => [...userQueryKeys.all, 'recentlyPlayed'] as const,
}

export const usePersonalInformation = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: ['user', 'personalInformation'],
    queryFn: () => bilibiliApi.getUserInfo(),
    staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
  })
}

export const useRecentlyPlayed = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: userQueryKeys.recentlyPlayed(),
    queryFn: () => bilibiliApi.getHistory(),
    staleTime: 1 * 60 * 1000,
  })
}
