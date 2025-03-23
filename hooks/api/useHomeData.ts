import { useQuery } from '@tanstack/react-query'
import type { BilibiliApi } from '@/lib/api/bilibili/bilibili'

export const homeQueryKeys = {
  all: ['home'] as const,
  recentlyPlayed: () => [...homeQueryKeys.all, 'recentlyPlayed'] as const,
  playlists: () => [...homeQueryKeys.all, 'playlists'] as const,
  popularVideos: () => [...homeQueryKeys.all, 'popularVideos'] as const,
  personalInformation: () =>
    [...homeQueryKeys.all, 'personalInformation'] as const,
} as const

export const usePersonalInformation = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: homeQueryKeys.personalInformation(),
    queryFn: () => bilibiliApi.getUserInfo(),
    staleTime: 20 * 60 * 1000, // 不需要刷新太频繁
  })
}

export const usePopularVideos = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: homeQueryKeys.popularVideos(),
    // 这是音乐分区的id
    queryFn: () => bilibiliApi.getPopularVideos('3'),
    staleTime: 5 * 60 * 1000,
  })
}

export const useRecentlyPlayed = (bilibiliApi: BilibiliApi) => {
  return useQuery({
    queryKey: homeQueryKeys.recentlyPlayed(),
    queryFn: () => bilibiliApi.getHistory(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export const useSyncedPlaylists = (
  bilibiliApi: BilibiliApi,
  userMid?: number,
) => {
  return useQuery({
    queryKey: homeQueryKeys.playlists(),
    queryFn: () => bilibiliApi.getFavoritePlaylists(userMid as number), // 这里需要断言，因为下面的enabled依赖于userMid
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userMid,
  })
}
