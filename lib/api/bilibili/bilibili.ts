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
import { formatMMSSToSeconds } from '@/utils/times'
import { BilibiliApiError } from '@/utils/errors'

/**
 * 转换B站bvid为avid
 */
function bv2av(bvid: string): number {
  const XOR_CODE = 23442827791579n
  const MASK_CODE = 2251799813685247n
  const BASE = 58n

  const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'
  const bvidArr = Array.from(bvid)
  ;[bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]]
  ;[bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]]
  bvidArr.splice(0, 3)
  const tmp = bvidArr.reduce(
    (pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)),
    0n,
  )
  return Number((tmp & MASK_CODE) ^ XOR_CODE)
}

/**
 * 转换B站历史记录视频为Track格式
 */
const transformHistoryVideosToTracks = (
  videos: BilibiliHistoryVideo[],
): Track[] => {
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

/**
 * 转换B站视频详情为Track格式
 */
const transformVideoDetailsToTracks = (
  videos: BilibiliVideoDetails[],
): Track[] => {
  try {
    return videos.map((video) => ({
      id: video.bvid,
      title: video.title,
      artist: video.owner.name,
      cover: video.pic,
      source: 'bilibili' as const,
      duration: Number(video.duration),
      createTime: video.pubdate,
      hasMetadata: true,
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

/**
 * 转换B站收藏夹为Playlist格式
 */
const transformFavoriteListsToPlaylists = (
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

/**
 * 转换B站搜索结果视频为Track格式
 */
const transformSearchResultsToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  return videos.map((video) => ({
    id: video.bvid,
    title: video.title.replace(/<em[^>]*>|<\/em>/g, ''),
    artist: video.author,
    cover: `https:${video.pic}`,
    source: 'bilibili' as const,
    duration: formatMMSSToSeconds(video.duration),
    createTime: video.senddate,
    hasMetadata: true,
  }))
}

/**
 * 转换B站热门搜索为简单对象
 */
const transformHotSearches = (
  hotSearches: BilibiliHotSearch[],
): { id: string; text: string }[] => {
  return hotSearches.map((item) => ({
    id: `hot_${item.keyword}`,
    text: item.keyword,
  }))
}

/**
 * 转换B站收藏夹内容为Track格式
 */
const transformFavoriteContentsToTracks = (
  contents: BilibiliFavoriteListContent[],
): Track[] => {
  try {
    if (!contents) return []
    return (
      contents
        // 去除已失效和非视频稿件
        .filter((content) => content.type === 2 && content.attr === 0)
        .map((content) => ({
          id: content.bvid,
          title: content.title,
          artist: content.upper.name,
          cover: content.cover,
          source: 'bilibili' as const,
          duration: content.duration,
          createTime: content.pubdate,
          hasMetadata: true,
        }))
    )
  } catch (error) {
    console.error(error)
    return []
  }
}

/**
 * 创建B站API客户端
 */
export const createBilibiliApi = (getCookie: () => string) => ({
  /**
   * 获取用户观看历史记录
   */
  async getHistory(): Promise<Track[]> {
    const response = await apiClient.get<BilibiliHistoryVideo[]>(
      '/x/v2/history',
      undefined,
      getCookie(),
    )
    return transformHistoryVideosToTracks(response)
  },

  /**
   * 获取分区热门视频
   */
  async getPopularVideos(partition: string): Promise<Track[]> {
    const response = await apiClient.get<{ list: BilibiliVideoDetails[] }>(
      `/x/web-interface/ranking/v2?rid=${partition}`,
      undefined,
      getCookie(),
    )
    return transformVideoDetailsToTracks(response.list)
  },

  /**
   * 获取用户收藏夹列表
   */
  async getFavoritePlaylists(userMid: number): Promise<Playlist[]> {
    const response = await apiClient.get<{ list: BilibiliPlaylist[] | null }>(
      `/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
      undefined,
      getCookie(),
    )
    if (!response.list) {
      return []
    }
    return transformFavoriteListsToPlaylists(response.list)
  },

  /**
   * 搜索视频
   */
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
      tracks: transformSearchResultsToTracks(response.result),
      numPages: response.numPages,
    }
  },

  /**
   * 获取热门搜索关键词
   */
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
    return transformHotSearches(response.trending.list)
  },

  /**
   * 获取视频音频流信息
   */
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
        getTime: Date.now() + 60,
        type: 'dash',
      }
    }
    for (const audio of response.dash.audio) {
      if (audio.id === audioQuality) {
        return {
          url: audio.baseUrl,
          quality: audio.id,
          getTime: Date.now() + 60,
          type: 'dash',
        }
      }
    }
    // 最后如果都没有符合条件的，做个兜底，选择最高质量的音频流
    return {
      url: response.dash.audio[0].baseUrl,
      quality: response.dash.audio[0].id,
      getTime: Date.now() + 60,
      type: 'dash',
    }
  },

  /**
   * 获取视频分P列表
   */
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

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<BilibiliUserInfo> {
    const response = await apiClient.get<BilibiliUserInfo>(
      '/x/space/myinfo',
      undefined,
      getCookie(),
    )
    return response
  },

  /**
   * 获取收藏夹内容(分页)
   */
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
      tracks: transformFavoriteContentsToTracks(response.medias),
      hasMore: response.has_more,
      favoriteMeta: response.info,
    }
  },

  /**
   * 获取收藏夹所有视频内容（仅bvid）
   */
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

  /**
   * 获取视频详细信息
   */
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

  /**
   * 批量删除收藏夹内容
   */
  async batchDeleteFavoriteListContents(
    favoriteId: number,
    bvids: string[],
  ): Promise<void> {
    const resources: string[] = []
    for (const bvid of bvids) {
      resources.push(`${bv2av(bvid)}:2`)
    }

    const regex = /(^|;)\s*bili_jct\s*=\s*([^;]+)/
    const csrf = getCookie().match(regex)
    if (!csrf) {
      throw new BilibiliApiError(
        'batchDeleteFavoriteListContents: 获取 csrf 失败，请检查是否填入正确 cookie！',
        0,
        { cookie: getCookie(), favoriteId, bvids },
      )
    }

    const data = {
      resources: resources.join(','),
      media_id: String(favoriteId),
      csrf: '6216783c30d2d64ddcf82a5baa804357',
      platform: 'web',
    }

    await apiClient.post<void>(
      '/x/v3/fav/resource/batch-del',
      new URLSearchParams(data).toString(),
      getCookie(),
    )

    return
  },
})
export type BilibiliApi = ReturnType<typeof createBilibiliApi>
