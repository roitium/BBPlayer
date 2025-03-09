import type {
  BilibiliHistoryVideo,
  BilibiliVideoDetails,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliHotSearch,
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
} from '@/types/apis/bilibili'
import { apiClient } from './client'
import type { Track, Playlist } from '@/types/core/media'

// 转换工具函数
const convertVideosToTracks = (videos: BilibiliHistoryVideo[]): Track[] => {
  return videos.map((video) => ({
    id: video.bvid,
    title: video.title,
    artist: video.owner.name,
    cover: video.pic,
    source: 'bilibili' as const,
    duration: video.duration,
    createTime: 0,
  }))
}

// 通过 details 接口获取的视频完整信息转换为 Track
const convertVideoDetailsToTracks = (
  videos: BilibiliVideoDetails[],
): Track[] => {
  return videos.map((video) => ({
    id: video.bvid,
    title: video.title,
    artist: video.owner.name,
    cover: video.pic,
    source: 'bilibili' as const,
    duration: formatDurationToSeconds(video.duration),
    createTime: video.pubtime,
  }))
}

const convertFavoriteToPlaylists = (
  playlists: BilibiliPlaylist[],
): Playlist[] => {
  return playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    count: playlist.media_count,
    cover: playlist.cover,
    source: 'bilibili' as const,
    biliType: 'favorite' as const,
  }))
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// HH:MM 转换为秒
const formatDurationToSeconds = (duration: string): number => {
  const [hours, minutes, seconds] = duration.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

// 转换搜索结果为Track
const convertSearchVideosToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  return videos.map((video) => ({
    id: video.bvid,
    title: video.title.replace(/<em[^>]*>|<\/em>/g, ''),
    artist: video.author,
    cover: `https:${video.pic}`,
    source: 'bilibili' as const,
    duration: formatDurationToSeconds(video.duration),
    createTime: video.senddate,
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

// API 方法
export const bilibiliApi = {
  // 获取历史记录
  async getHistory(): Promise<Track[]> {
    const response =
      await apiClient.get<BilibiliHistoryVideo[]>('/x/v2/history')
    return convertVideosToTracks(response)
  },

  // 获取某个分区的热门视频
  async getPopularVideos(partition: string): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideoDetails[] }>(
      `/x/web-interface/ranking/v2?rid=${partition}`,
    )
    return convertVideoDetailsToTracks(response.list)
  },

  // 获取收藏夹列表
  async getFavoritePlaylists(userMid: number): Promise<Playlist[]> {
    const response = await apiClient.get<{ list: BilibiliPlaylist[] | null }>(
      `/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
    )
    if (!response.list) {
      return []
    }
    return convertFavoriteToPlaylists(response.list)
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

  // 获取音频流（dash）
  async getAudioStream({
    bvid,
    cid,
    audioQuality,
    enableDolby,
    enableHiRes,
  }: BilibiliAudioStreamParams): Promise<Track['biliStreamUrl']> {
    const response = await apiClient.get<BilibiliAudioStreamResponse>(
      '/x/player/wbi/playurl',
      {
        bvid,
        cid: String(cid),
      },
    )
    if (!response.dash.audio) {
      throw new Error('未找到音频流')
    }
    if (enableDolby && response.dash.dolby?.audio) {
      return {
        url: response.dash.dolby.audio[0].baseUrl,
        quality: response.dash.dolby.audio[0].id,
        getTime: Date.now() + 60, // 在当前时间基础上加 60 秒，做个提前量
        type: 'dash',
      }
    }
    if (enableHiRes && response.dash.hiRes?.audio) {
      return {
        url: response.dash.hiRes.audio.baseUrl,
        quality: response.dash.hiRes.audio.id,
        getTime: Date.now() + 60, // 在当前时间基础上加 60 秒，做个提前量
        type: 'dash',
      }
    }
    for (const audio of response.dash.audio) {
      if (audio.id === audioQuality) {
        return {
          url: audio.baseUrl,
          quality: audio.id,
          getTime: Date.now() + 60, // 在当前时间基础上加 60 秒，做个提前量
          type: 'dash',
        }
      }
    }
    throw new Error('未找到音频流')
  },
}
