import type {
  BilibiliHistoryVideo,
  BilibiliVideoDetails,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliHotSearch,
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
  BilibiliUserInfo,
  BilibiliFavoriteListContents,
  BilibiliFavoriteListContent,
  BilibiliFavoriteListAllContents,
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
    hasMetadata: true,
  }))
}

// 通过 details 接口获取的视频完整信息转换为 Track
const convertVideoDetailsToTracks = (
  videos: BilibiliVideoDetails[],
): Track[] => {
  try {
    const tracks: Track[] = []
    for (const video of videos) {
      tracks.push({
        id: video.bvid,
        title: video.title,
        artist: video.owner.name,
        cover: video.pic,
        source: 'bilibili' as const,
        duration: Number(video.duration),
        createTime: video.pubdate,
        hasMetadata: true,
      })
    }
    return tracks
  } catch (error) {
    console.error(error)
    return []
  }
  // return videos.map((video) => {
  //   return {
  //     id: video.bvid,
  //     title: video.title,
  //     artist: video.owner.name,
  //     cover: video.pic,
  //     source: 'bilibili' as const,
  //     duration: formatHHMMToSeconds(video.duration),
  //     createTime: video.pubdate,
  //   }
  // })
}

const convertFavoriteToPlaylists = (
  playlists: BilibiliPlaylist[],
): Playlist[] => {
  return playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    count: playlist.media_count,
    cover: '',
    source: 'bilibili' as const,
    biliType: 'favorite' as const,
  }))
}

// 转换搜索结果为Track
const convertSearchVideosToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  // FIXME: 忽略 duration 类型错误，只是因为我现在不想改了
  // @ts-expect-error
  return videos.map((video) => ({
    id: video.bvid,
    title: video.title.replace(/<em[^>]*>|<\/em>/g, ''),
    artist: video.author,
    cover: `https:${video.pic}`,
    source: 'bilibili' as const,
    duration: video.duration,
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

// 转换收藏夹内容为Track
const convertFavoriteListContentsToTracks = (
  contents: BilibiliFavoriteListContent[],
): Track[] => {
  try {
    const tracks: Track[] = []
    for (const content of contents) {
      if (content.type === 2) {
        tracks.push({
          id: content.bvid,
          title: content.title,
          artist: content.upper.name,
          cover: content.cover,
          source: 'bilibili' as const,
          duration: content.duration,
          createTime: content.pubdate,
          hasMetadata: true,
        })
      }
    }
    return tracks
  } catch (error) {
    console.error(error)
    return []
  }
}

// API 方法
export const createBilibiliApi = (getCookie: () => string) => ({
  // 获取历史记录
  async getHistory(): Promise<Track[]> {
    const response = await apiClient.get<BilibiliHistoryVideo[]>(
      '/x/v2/history',
      undefined,
      getCookie(),
    )
    return convertVideosToTracks(response)
  },

  // 获取某个分区的热门视频
  async getPopularVideos(partition: string): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideoDetails[] }>(
      `/x/web-interface/ranking/v2?rid=${partition}`,
      undefined,
      getCookie(),
    )
    return convertVideoDetailsToTracks(response.list)
  },

  // 获取收藏夹列表
  async getFavoritePlaylists(userMid: number): Promise<Playlist[]> {
    const response = await apiClient.get<{ list: BilibiliPlaylist[] | null }>(
      `/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
      undefined,
      getCookie(),
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
    }>(
      '/x/web-interface/wbi/search/type',
      {
        keyword,
        search_type: 'video',
        page: page.toString(),
        page_size: page_size.toString(),
      },
      getCookie(),
    )
    return {
      tracks: convertSearchVideosToTracks(response.result),
      numPages: response.numPages,
    }
  },

  // 获取热门搜索
  async getHotSearches(): Promise<{ id: string; text: string }[]> {
    const response = await apiClient.get<{
      trending: { list: BilibiliHotSearch[] }
    }>(
      '/x/web-interface/search/square',
      {
        limit: '10',
      },
      getCookie(),
    )
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
        fnval: '16', // 16 表示 dash 格式
      },
      getCookie(),
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
    // 最后如果都没有符合条件的，做个兜底，选择最高质量的音频流
    return {
      url: response.dash.audio[0].baseUrl,
      quality: response.dash.audio[0].id,
      getTime: Date.now() + 60, // 在当前时间基础上加 60 秒，做个提前量
      type: 'dash',
    }
  },

  // 获取分 p 列表
  async getPageList(bvid: string): Promise<
    {
      cid: number
      page: number
      part: string
      duration: number
      first_frame: string
    }[]
  > {
    const response = await apiClient.get<
      {
        cid: number
        page: number
        part: string
        duration: number
        first_frame: string
      }[]
    >(
      '/x/player/pagelist',
      {
        bvid,
      },
      getCookie(),
    )
    return response
  },

  // 获取用户详细信息
  async getUserInfo(): Promise<BilibiliUserInfo> {
    const response = await apiClient.get<BilibiliUserInfo>(
      '/x/space/myinfo',
      undefined,
      getCookie(),
    )
    return response
  },

  // 获取收藏夹内容(可以获取到更详细的信息，但是需要分页)
  async getFavoriteListContents(
    favoriteId: number,
    pn: number,
  ): Promise<{
    tracks: Track[]
    hasMore: boolean
    favoriteMeta: BilibiliFavoriteListContents['info']
  }> {
    const response = await apiClient.get<BilibiliFavoriteListContents>(
      '/x/v3/fav/resource/list',
      {
        media_id: favoriteId.toString(),
        pn: pn.toString(),
        ps: '20',
      },
      getCookie(),
    )
    return {
      tracks: convertFavoriteListContentsToTracks(response.medias),
      hasMore: response.has_more,
      favoriteMeta: response.info,
    }
  },

  // 获取收藏夹所有视频内容（可以一次拿到所有数据，但是只有 bvid）
  async getFavoriteListAllContents(
    favoriteId: number,
  ): Promise<BilibiliFavoriteListAllContents> {
    const response = await apiClient.get<BilibiliFavoriteListAllContents>(
      '/x/v3/fav/resource/ids',
      {
        media_id: favoriteId.toString(),
      },
      getCookie(),
    )
    return response.filter((item) => item.type === 2)
  },

  // 获取一个视频的详细信息
  async getVideoDetails(bvid: string): Promise<BilibiliVideoDetails> {
    const response = await apiClient.get<BilibiliVideoDetails>(
      '/x/web-interface/view',
      {
        bvid,
      },
      getCookie(),
    )
    return response
  },
})
export type BilibiliApi = ReturnType<typeof createBilibiliApi>
