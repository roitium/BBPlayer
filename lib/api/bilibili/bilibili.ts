import { Result, type ResultAsync, okAsync, errAsync } from 'neverthrow'
import { apiClient } from './client'
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
  BilibiliCollection,
  BilibiliCollectionAllContents,
  BilibiliMediaItem,
  BilibiliCollectionInfo,
} from '@/types/apis/bilibili'
import type { Track, Playlist } from '@/types/core/media'
import { formatMMSSToSeconds } from '@/utils/times'
import {
  AudioStreamError,
  CsrfError,
  type BilibiliApiError,
  type BilibiliApiMethodError,
} from '@/utils/errors'
import log from '@/utils/log'

const bilibiliApiLog = log.extend('BILIBILI_API')

/**
 * 转换B站bvid为avid (同步操作，保持不变)
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

const transformHistoryVideosToTracks = (
  videos: BilibiliHistoryVideo[],
): Track[] => {
  try {
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
  } catch (error) {
    bilibiliApiLog.error('Error transforming history videos:', error)
    return []
  }
}

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
    bilibiliApiLog.error('Error transforming video details:', error)
    return []
  }
}

const transformFavoriteListsToPlaylists = (
  playlists: BilibiliPlaylist[] | null,
): Playlist[] => {
  if (!playlists) return []
  try {
    return playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      count: playlist.media_count,
      cover: '',
      source: 'bilibili' as const,
      biliType: 'favorite' as const,
    }))
  } catch (error) {
    bilibiliApiLog.error('Error transforming favorite lists:', error)
    return []
  }
}

const transformSearchResultsToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  if (!videos) return []
  try {
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
  } catch (error) {
    bilibiliApiLog.error('Error transforming search results:', error)
    return []
  }
}

const transformHotSearches = (
  hotSearches: BilibiliHotSearch[],
): { id: string; text: string }[] => {
  if (!hotSearches) return []
  try {
    return hotSearches.map((item) => ({
      id: `hot_${item.keyword}`,
      text: item.keyword,
    }))
  } catch (error) {
    bilibiliApiLog.error('Error transforming hot searches:', error)
    return []
  }
}

const transformFavoriteContentsToTracks = (
  contents: BilibiliFavoriteListContent[] | null,
): Track[] => {
  if (!contents) return []
  try {
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
    bilibiliApiLog.error('Error transforming favorite contents:', error)
    return []
  }
}

const transformCollectionAllContentsToTracks = (
  contents: BilibiliMediaItem[],
): Track[] => {
  if (!contents) return []
  try {
    return contents.map((content) => ({
      id: content.bvid,
      title: content.title,
      artist: content.upper.name,
      cover: content.cover,
      source: 'bilibili' as const,
      duration: content.duration,
      createTime: content.pubtime,
      hasMetadata: true,
    }))
  } catch (error) {
    bilibiliApiLog.error('Error transforming collection contents:', error)
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
  getHistory(): ResultAsync<Track[], BilibiliApiError> {
    return apiClient
      .get<BilibiliHistoryVideo[]>('/x/v2/history', undefined, getCookie())
      .map(transformHistoryVideosToTracks)
  },

  /**
   * 获取分区热门视频
   */
  getPopularVideos(partition: string): ResultAsync<Track[], BilibiliApiError> {
    return apiClient
      .get<{ list: BilibiliVideoDetails[] }>(
        `/x/web-interface/ranking/v2?rid=${partition}`,
        undefined,
        getCookie(),
      )
      .map((response) => transformVideoDetailsToTracks(response.list))
  },

  /**
   * 获取用户收藏夹列表
   */
  getFavoritePlaylists(
    userMid: number,
  ): ResultAsync<Playlist[], BilibiliApiError> {
    return apiClient
      .get<{ list: BilibiliPlaylist[] | null }>(
        `/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
        undefined,
        getCookie(),
      )
      .map((response) => transformFavoriteListsToPlaylists(response.list))
  },

  /**
   * 搜索视频
   */
  searchVideos(
    keyword: string,
    page: number,
    page_size: number,
  ): ResultAsync<{ tracks: Track[]; numPages: number }, BilibiliApiError> {
    return apiClient
      .get<{
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
      .map((response) => ({
        tracks: transformSearchResultsToTracks(response.result),
        numPages: response.numPages,
      }))
  },

  /**
   * 获取热门搜索关键词
   */
  getHotSearches(): ResultAsync<
    { id: string; text: string }[],
    BilibiliApiError
  > {
    return apiClient
      .get<{
        trending: { list: BilibiliHotSearch[] }
      }>(
        '/x/web-interface/search/square',
        {
          limit: '10',
        },
        getCookie(),
      )
      .map((response) => transformHotSearches(response.trending.list))
  },

  /**
   * 获取视频音频流信息
   */
  getAudioStream(
    params: BilibiliAudioStreamParams,
  ): ResultAsync<Track['biliStreamUrl'], BilibiliApiMethodError> {
    const { bvid, cid, audioQuality, enableDolby, enableHiRes } = params
    return apiClient
      .get<BilibiliAudioStreamResponse>(
        '/x/player/wbi/playurl',
        {
          bvid,
          cid: String(cid),
          fnval: '16', // 16 表示 dash 格式
        },
        getCookie(),
      )
      .andThen((response) => {
        const { dash } = response

        if (!dash?.audio || dash.audio.length === 0) {
          return errAsync(new AudioStreamError('未找到有效的音频流数据'))
        }

        let stream: Track['biliStreamUrl'] | null = null
        const getTime = Date.now() + 60 * 1000 // 加 60s 提前量

        // Dolby
        if (enableDolby && dash.dolby?.audio && dash.dolby.audio.length > 0) {
          stream = {
            url: dash.dolby.audio[0].baseUrl,
            quality: dash.dolby.audio[0].id,
            getTime,
            type: 'dash',
          }
          // Hi-Res
        } else if (enableHiRes && dash.hiRes?.audio) {
          stream = {
            url: dash.hiRes.audio.baseUrl,
            quality: dash.hiRes.audio.id,
            getTime,
            type: 'dash',
          }
          // 筛选指定质量
        } else {
          const targetAudio = dash.audio.find(
            (audio) => audio.id === audioQuality,
          )
          if (targetAudio) {
            stream = {
              url: targetAudio.baseUrl,
              quality: targetAudio.id,
              getTime,
              type: 'dash',
            }
          }
        }

        // 如果没有找到匹配的流，则使用第一个可用流（最高质量）
        if (!stream) {
          stream = {
            url: dash.audio[0].baseUrl,
            quality: dash.audio[0].id,
            getTime,
            type: 'dash',
          }
        }

        return okAsync(stream)
      })
  },

  /**
   * 获取视频分P列表
   */
  getPageList(bvid: string): ResultAsync<
    {
      cid: number
      page: number
      part: string
      duration: number
      first_frame: string
    }[],
    BilibiliApiError
  > {
    return apiClient.get<
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
  },

  /**
   * 获取用户信息
   */
  getUserInfo(): ResultAsync<BilibiliUserInfo, BilibiliApiError> {
    return apiClient.get<BilibiliUserInfo>(
      '/x/space/myinfo',
      undefined,
      getCookie(),
    )
  },

  /**
   * 获取收藏夹内容(分页)
   */
  getFavoriteListContents(
    favoriteId: number,
    pn: number,
  ): ResultAsync<
    {
      tracks: Track[]
      hasMore: boolean
      favoriteMeta: BilibiliFavoriteListContents['info']
    },
    BilibiliApiError
  > {
    return apiClient
      .get<BilibiliFavoriteListContents>(
        '/x/v3/fav/resource/list',
        {
          media_id: favoriteId.toString(),
          pn: pn.toString(),
          ps: '20', // Page size
        },
        getCookie(),
      )
      .map((response) => ({
        tracks: transformFavoriteContentsToTracks(response.medias),
        hasMore: response.has_more,
        favoriteMeta: response.info,
      }))
  },

  /**
   * 获取收藏夹所有视频内容（仅bvid和类型）
   */
  getFavoriteListAllContents(
    favoriteId: number,
  ): ResultAsync<BilibiliFavoriteListAllContents, BilibiliApiError> {
    return apiClient
      .get<BilibiliFavoriteListAllContents>(
        '/x/v3/fav/resource/ids',
        {
          media_id: favoriteId.toString(),
        },
        getCookie(),
      )
      .map((response) => response.filter((item) => item.type === 2)) // 过滤非视频稿件
  },

  /**
   * 获取视频详细信息
   */
  getVideoDetails(
    bvid: string,
  ): ResultAsync<BilibiliVideoDetails, BilibiliApiError> {
    // Direct pass-through
    return apiClient.get<BilibiliVideoDetails>(
      '/x/web-interface/view',
      {
        bvid,
      },
      getCookie(),
    )
  },

  /**
   * 批量删除收藏夹内容
   */
  batchDeleteFavoriteListContents(
    favoriteId: number,
    bvids: string[],
  ): ResultAsync<void, BilibiliApiMethodError> {
    const resourcesResult = Result.fromThrowable(
      () => bvids.map((bvid) => `${bv2av(bvid)}:2`), // bv2av could throw if bvid is invalid format, though unlikely here
      (e) =>
        new Error(
          `转换 bvid 到 avid 失败: ${e instanceof Error ? e.message : String(e)}`,
        ),
    )()

    const csrfResult = Result.fromThrowable(
      () => {
        const cookie = getCookie()
        const regex = /(^|;)\s*bili_jct\s*=\s*([^;]+)/
        const match = cookie.match(regex)
        if (!match || !match[2]) {
          throw new CsrfError(
            'batchDeleteFavoriteListContents: 获取 csrf 失败，请检查 cookie',
            { cookie, favoriteId, bvids },
          )
        }
        return match[2]
      },
      (e) =>
        e instanceof CsrfError
          ? e
          : new Error(
              `提取 CSRF 时发生未知错误: ${e instanceof Error ? e.message : String(e)}`,
            ),
    )()

    return Result.combine([resourcesResult, csrfResult]).asyncAndThen(
      ([resources, csrfToken]) => {
        const data = {
          resources: resources.join(','),
          media_id: String(favoriteId),
          csrf: csrfToken,
          platform: 'web',
        }
        return apiClient.post<void>(
          '/x/v3/fav/resource/batch-del',
          new URLSearchParams(data),
          getCookie(),
        )
      },
    )
  },

  /**
   * 获取用户追更的视频合集/收藏夹（非用户自己创建的）
   */
  getCollectionsList(
    pageNumber: number,
    mid: number,
  ): ResultAsync<
    { list: BilibiliCollection[]; count: number; hasMore: boolean },
    BilibiliApiError
  > {
    return apiClient
      .get<{
        list: BilibiliCollection[]
        count: number
        has_more: boolean
      }>(
        '/x/v3/fav/folder/collected/list',
        {
          pn: pageNumber.toString(),
          ps: '70', // Page size
          up_mid: mid.toString(),
          platform: 'web',
        },
        getCookie(),
      )
      .map((response) => ({
        list: response.list ?? [],
        count: response.count,
        hasMore: response.has_more,
      }))
  },

  /**
   * 获取合集详细信息和完整内容
   */
  getCollectionAllContents(
    collectionId: number,
  ): ResultAsync<
    { info: BilibiliCollectionInfo; medias: Track[] },
    BilibiliApiError
  > {
    return apiClient
      .get<BilibiliCollectionAllContents>(
        '/x/space/fav/season/list',
        {
          season_id: collectionId.toString(),
          ps: '20',
          pn: '1',
        },
        getCookie(),
      )
      .map((response) => {
        return {
          info: response.info,
          medias: transformCollectionAllContentsToTracks(response.medias),
        }
      })
  },
})

export type BilibiliApi = ReturnType<typeof createBilibiliApi>
