import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'

const userQueryKeys = {
  all: ['bilibili', 'user'] as const,
  personalInformation: () =>
    [...userQueryKeys.all, 'personalInformation'] as const,
  recentlyPlayed: () => [...userQueryKeys.all, 'recentlyPlayed'] as const,
}

export const usePersonalInformation = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: userQueryKeys.personalInformation(),
    queryFn: () => returnOrThrowAsync(bilibiliApi.getUserInfo()),
    staleTime: 24 * 60 * 1000, // 不需要刷新太频繁
    enabled: !!bilibiliApi.getCookie(),
  })
}

export const useRecentlyPlayed = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: userQueryKeys.recentlyPlayed(),
    queryFn: () => returnOrThrowAsync(bilibiliApi.getHistory()),
    staleTime: 1 * 60 * 1000,
    enabled: !!bilibiliApi.getCookie(),
  })
}
