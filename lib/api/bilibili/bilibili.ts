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

// 搜索结果接口
interface BilibiliSearchVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  author: string
  duration: string
}

// 热门搜索接口
interface BilibiliHotSearch {
  keyword: string
  show_name: string
}

// 搜索历史接口
interface BilibiliSearchHistory {
  keyword: string
  id: number
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

// 转换搜索结果为Track
const convertSearchVideosToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  return videos.map((video) => ({
    id: video.aid,
    title: video.title.replace(/<em[^>]*>|<\/em>/g, ''),
    artist: video.author,
    cover: `https:${video.pic}`,
    source: 'bilibili' as const,
    duration: video.duration,
  }))
}

// 转换热门搜索为简单对象
const convertHotSearches = (
  hotSearches: BilibiliHotSearch[],
): { id: string; text: string }[] => {
  return hotSearches.map((item) => ({
    id: `hot_${item.keyword}`,
    text: item.keyword,
  }))
}

// 转换搜索历史为简单对象
const convertSearchHistory = (
  history: BilibiliSearchHistory[],
): { id: string; text: string }[] => {
  return history.map((item) => ({
    id: `history_${item.id}`,
    text: item.keyword,
  }))
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
  async getFavoritePlaylists(userMid: number): Promise<Playlist[]> {
    const response = await apiClient.get<{ list: BilibiliPlaylist[] }>(
      `/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
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

  // 搜索视频
  async searchVideos(
    keyword: string,
    page: number,
    page_size: number,
  ): Promise<{ tracks: Track[]; numPages: number }> {
    const response = await apiClient.get<{
      result: BilibiliSearchVideo[]
      numPages: number
    }>('/x/web-interface/wbi/search/type', {
      keyword,
      search_type: 'video',
      page: page.toString(),
      page_size: page_size.toString(),
    })
    return {
      tracks: convertSearchVideosToTracks(response.result),
      numPages: response.numPages,
    }
  },

  // 获取热门搜索
  async getHotSearches(): Promise<{ id: string; text: string }[]> {
    const response = await apiClient.get<{
      trending: { list: BilibiliHotSearch[] }
    }>('/x/web-interface/search/square', {
      limit: '10',
    })
    return convertHotSearches(response.trending.list)
  },
}
