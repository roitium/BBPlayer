import { apiClient } from './client'
import type { Track, Playlist } from '@/hooks/api/types'

interface BilibiliVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  owner: {
    name: string
  }
  duration: number
}

interface BilibiliPlaylist {
  id: number
  title: string
  cover: string
  media_count: number
}

// 转换工具函数
const convertVideosToTracks = (videos: BilibiliVideo[]): Track[] => {
  return videos.map((video) => ({
    id: video.aid,
    title: video.title,
    artist: video.owner.name,
    cover: video.pic,
    source: 'bilibili' as const,
    duration: formatDuration(video.duration),
  }))
}

const convertPlaylistsToPlaylists = (
  playlists: BilibiliPlaylist[],
): Playlist[] => {
  return playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    count: playlist.media_count,
    cover: playlist.cover,
    source: 'bilibili' as const,
  }))
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// API 方法
export const bilibiliApi = {
  // 获取历史记录
  async getHistory(): Promise<Track[]> {
    const response = await apiClient.get<BilibiliVideo[]>('/x/v2/history')
    return convertVideosToTracks(response)
  },

  // 获取某个分区的热门视频
  async getPopularVideos(partition: string): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideo[] }>(
      `/x/web-interface/ranking/v2?rid=${partition}`,
    )
    return convertVideosToTracks(response.list)
  },

  // 获取推荐视频
  async getRecommendations(): Promise<Track[]> {
    const response = await apiClient.get<{ item: BilibiliVideo[] }>(
      '/x/web-interface/index/top/feed/rcmd',
    )
    return convertVideosToTracks(response.item)
  },

  // 获取收藏夹列表
  async getFavoritePlaylists(): Promise<Playlist[]> {
    const response = await apiClient.get<{ list: BilibiliPlaylist[] }>(
      '/x/v3/fav/folder/created/list-all',
    )
    return convertPlaylistsToPlaylists(response.list)
  },

  // 获取稍后再看列表
  async getWatchLater(): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideo[] }>(
      '/x/v2/history/toview',
    )
    return convertVideosToTracks(response.list)
  },

  // 获取关注的UP主最新视频
  async getFollowingVideos(): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideo[] }>(
      '/x/web-interface/dynamic/region',
    )
    return convertVideosToTracks(response.list)
  },
}
