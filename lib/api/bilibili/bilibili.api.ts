import { errAsync, okAsync, Result, type ResultAsync } from 'neverthrow'
import type {
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
  BilibiliCollection,
  BilibiliCollectionAllContents,
  BilibiliCollectionInfo,
  BilibiliDealFavoriteForOneVideoResponse,
  BilibiliFavoriteListAllContents,
  BilibiliFavoriteListContents,
  BilibiliHistoryVideo,
  BilibiliHotSearch,
  BilibiliMultipageVideo,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliUserInfo,
  BilibiliUserUploadedVideosResponse,
  BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { Playlist, Track } from '@/types/core/media'
import {
  type ApiCallingError,
  AudioStreamError,
  type BilibiliApiError,
} from '@/utils/errors'
import log from '@/utils/log'
import { bilibiliApiClient } from './bilibili.client'
import {
  transformCollectionAllContentsToTracks,
  transformFavoriteContentsToTracks,
  transformFavoriteListsToPlaylists,
  transformHistoryVideosToTracks,
  transformHotSearches,
  transformSearchResultsToTracks,
  transformVideoDetailsToTracks,
} from './bilibili.transformers'
import {
  bv2av,
  convertToFormDataString,
  extractCsrfToken,
} from './bilibili.utils'
import getWbiEncodedParams from './bilibili.wbi'

const bilibiliApiLog = log.extend('BILIBILI_API/API')

/**
 * 创建B站API客户端
 */
export const createBilibiliApi = (getCookie: () => string) => ({
  /**
   * 获取 cookie
   */
  getCookie: () => getCookie(),

  /**
   * 获取用户观看历史记录
   */
  getHistory(): ResultAsync<Track[], BilibiliApiError> {
    return bilibiliApiClient
      .get<BilibiliHistoryVideo[]>('/x/v2/history', undefined, getCookie())
      .map(transformHistoryVideosToTracks)
  },

  /**
   * 获取分区热门视频
   */
  getPopularVideos(partition: string): ResultAsync<Track[], BilibiliApiError> {
    return bilibiliApiClient
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
    return bilibiliApiClient
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
    return bilibiliApiClient
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
    return bilibiliApiClient
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
  ): ResultAsync<Track['biliStreamUrl'], ApiCallingError> {
    const { bvid, cid, audioQuality, enableDolby, enableHiRes } = params
    return bilibiliApiClient
      .get<BilibiliAudioStreamResponse>(
        '/x/player/wbi/playurl',
        {
          bvid,
          cid: String(cid),
          fnval: '16', // 16 表示 dash 格式
          fnver: '0',
          fourk: '1',
          qlt: String(audioQuality),
        },
        getCookie(),
      )
      .andThen((response) => {
        const { dash } = response

        if (enableHiRes && dash?.hiRes?.audio) {
          bilibiliApiLog.debug('优先使用 Hi-Res 音频流')
          return okAsync({
            url: dash.hiRes.audio.baseUrl,
            quality: dash.hiRes.audio.id,
            getTime: Date.now() + 60 * 1000, // Add 60s buffer
            type: 'dash' as const,
          })
        }

        if (enableDolby && dash?.dolby?.audio && dash.dolby.audio.length > 0) {
          bilibiliApiLog.debug('优先使用 Dolby 音频流')
          return okAsync({
            url: dash.dolby.audio[0].baseUrl,
            quality: dash.dolby.audio[0].id,
            getTime: Date.now() + 60 * 1000, // Add 60s buffer
            type: 'dash' as const,
          })
        }

        if (!dash?.audio || dash.audio.length === 0) {
          bilibiliApiLog.error('未找到有效的音频流数据', { response })
          return errAsync(new AudioStreamError('未找到有效的音频流数据'))
        }

        let stream: Track['biliStreamUrl'] | null = null
        const getTime = Date.now() + 60 * 1000 // 加 60s 提前量

        // 尝试找到指定质量的音频流
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
          bilibiliApiLog.debug('找到指定质量音频流', { quality: audioQuality })
        } else {
          // Fallback: 使用最高质量如果未找到指定质量
          bilibiliApiLog.warn('未找到指定质量音频流，使用最高质量', {
            requestedQuality: audioQuality,
            availableQualities: dash.audio.map((a) => a.id),
          })
          const highestQualityAudio = dash.audio[0]
          if (highestQualityAudio) {
            stream = {
              url: highestQualityAudio.baseUrl,
              quality: highestQualityAudio.id,
              getTime,
              type: 'dash',
            }
          }
        }

        if (!stream) {
          bilibiliApiLog.error('未能确定任何可用的音频流', { response })
          return errAsync(new AudioStreamError('未能确定任何可用的音频流'))
        }

        return okAsync(stream)
      })
      .mapErr((e) => {
        if (e instanceof AudioStreamError) {
          return e
        }
        return new AudioStreamError(
          `获取音频流失败: ${e instanceof Error ? e.message : String(e)}`,
        )
      })
  },

  /**
   * 获取视频分P列表
   */
  getPageList(
    bvid: string,
  ): ResultAsync<BilibiliMultipageVideo[], BilibiliApiError> {
    return bilibiliApiClient.get<BilibiliMultipageVideo[]>(
      '/x/player/pagelist',
      {
        bvid,
      },
      getCookie(),
    )
  },

  /**
   * 获取登录本人信息
   */
  getUserInfo(): ResultAsync<BilibiliUserInfo, BilibiliApiError> {
    return bilibiliApiClient.get<BilibiliUserInfo>(
      '/x/space/myinfo',
      undefined,
      getCookie(),
    )
  },

  /**
   * 获取别人用户信息
   * （目前采用请求「用户名片信息」接口实现，因为获取个人信息的接口需要 Wbi 鉴权，我还没实现）
   */
  getOtherUserInfo(
    mid: number,
  ): ResultAsync<BilibiliUserInfo, BilibiliApiError> {
    const params = getWbiEncodedParams(
      {
        mid: mid.toString(),
      },
      getCookie(),
    )
    return params.andThen((params) => {
      return bilibiliApiClient.get<BilibiliUserInfo>(
        '/x/space/wbi/acc/info',
        params,
        getCookie(),
      )
    })
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
    return bilibiliApiClient
      .get<BilibiliFavoriteListContents>(
        '/x/v3/fav/resource/list',
        {
          media_id: favoriteId.toString(),
          pn: pn.toString(),
          ps: '40',
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
   * 搜索收藏夹内容
   * @param favoriteId 如果是全局搜索，随意提供一个**有效**的收藏夹 ID 即可
   */
  searchFavoriteListContents(
    favoriteId: number,
    scope: 'all' | 'this',
    pn: number,
    keyword: string,
  ): ResultAsync<
    {
      tracks: Track[]
      hasMore: boolean
      favoriteMeta: BilibiliFavoriteListContents['info']
    },
    BilibiliApiError
  > {
    return bilibiliApiClient
      .get<BilibiliFavoriteListContents>(
        '/x/v3/fav/resource/list',
        {
          media_id: favoriteId.toString(),
          pn: pn.toString(),
          ps: '40',
          keyword,
          type: scope === 'this' ? '0' : '1',
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
   * 此接口用于获取收藏夹内所有视频的bvid，常用于批量操作前获取所有目标ID
   */
  getFavoriteListAllContents(
    favoriteId: number,
  ): ResultAsync<BilibiliFavoriteListAllContents, BilibiliApiError> {
    return bilibiliApiClient
      .get<BilibiliFavoriteListAllContents>(
        '/x/v3/fav/resource/ids',
        {
          media_id: favoriteId.toString(),
        },
        getCookie(),
      )
      .map((response) => response.filter((item) => item.type === 2)) // 过滤非视频稿件 (type 2 is video)
  },

  /**
   * 获取视频详细信息
   */
  getVideoDetails(
    bvid: string,
  ): ResultAsync<BilibiliVideoDetails, BilibiliApiError> {
    return bilibiliApiClient.get<BilibiliVideoDetails>(
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
  ): ResultAsync<0, ApiCallingError> {
    const resourcesResult = Result.fromThrowable(
      () => bvids.map((bvid) => `${bv2av(bvid)}:2`),
      (e) =>
        new Error(
          `转换 bvid 到 avid 失败: ${e instanceof Error ? e.message : String(e)}`,
        ),
    )()

    const csrfResult = extractCsrfToken(getCookie())

    return Result.combine([resourcesResult, csrfResult]).asyncAndThen(
      ([resources, csrfToken]) => {
        const data = {
          resources: resources.join(','),
          media_id: String(favoriteId),
          platform: 'web',
          csrf: csrfToken,
        }
        bilibiliApiLog.debug(
          '批量删除收藏',
          new URLSearchParams(data).toString(),
        )
        return bilibiliApiClient.post<0>(
          '/x/v3/fav/resource/batch-del',
          convertToFormDataString(data),
          getCookie(),
        )
      },
    )
  },

  /**
   * 获取用户追更的视频合集/收藏夹（非用户自己创建的）列表
   */
  getCollectionsList(
    pageNumber: number,
    mid: number,
  ): ResultAsync<
    { list: BilibiliCollection[]; count: number; hasMore: boolean },
    BilibiliApiError
  > {
    return bilibiliApiClient
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
        list: response.list ?? [], // Ensure list is always an array
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
    return bilibiliApiClient
      .get<BilibiliCollectionAllContents>(
        '/x/space/fav/season/list',
        {
          season_id: collectionId.toString(),
          ps: '20', // Page size, adjust if needed
          pn: '1', // Start from page 1
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

  /**
   * 单个视频添加/删除到多个收藏夹
   */
  dealFavoriteForOneVideo: (
    bvid: string,
    addToFavoriteIds: string[],
    delInFavoriteIds: string[],
  ): ResultAsync<BilibiliDealFavoriteForOneVideoResponse, ApiCallingError> => {
    const avid = bv2av(bvid)
    const addToFavoriteIdsCombined = addToFavoriteIds.join(',')
    const delInFavoriteIdsCombined = delInFavoriteIds.join(',')
    const csrfResult = extractCsrfToken(getCookie())
    if (csrfResult.isErr()) {
      return errAsync(csrfResult.error)
    }
    const data = {
      rid: String(avid),
      add_media_ids: addToFavoriteIdsCombined,
      del_media_ids: delInFavoriteIdsCombined,
      csrf: csrfResult.value,
      type: '2',
    }
    return bilibiliApiClient.post<BilibiliDealFavoriteForOneVideoResponse>(
      '/x/v3/fav/resource/deal',
      convertToFormDataString(data),
      getCookie(),
    )
  },

  /**
   * 获取目标视频的收藏情况
   */
  getTargetVideoFavoriteStatus(
    userMid: number,
    bvid: string,
  ): ResultAsync<BilibiliPlaylist[], BilibiliApiError> {
    const avid = bv2av(bvid)
    return bilibiliApiClient
      .get<{ list: BilibiliPlaylist[] | null }>(
        '/x/v3/fav/folder/created/list-all',
        {
          up_mid: userMid.toString(),
          rid: String(avid),
          type: '2',
        },
        getCookie(),
      )
      .map((response) => {
        if (!response.list) {
          return []
        }
        return response.list
      })
  },

  /*
   * 上报观看记录
   */
  reportPlaybackHistory: (
    bvid: string,
    cid: number,
  ): ResultAsync<0, ApiCallingError> => {
    const avid = bv2av(bvid)
    const csrfResult = extractCsrfToken(getCookie())
    if (csrfResult.isErr()) {
      return errAsync(csrfResult.error)
    }
    const data = {
      aid: String(avid),
      cid: String(cid),
      progress: '0', // 咱们只是为了上报播放记录，而非具体进度
      csrf: csrfResult.value,
    }
    return bilibiliApiClient.post<0>(
      '/x/v2/history/report',
      convertToFormDataString(data),
      getCookie(),
    )
  },

  /*
   * 查询用户投稿视频明细
   */
  getUserUploadedVideos: (
    mid: number,
    pn: number,
  ): ResultAsync<BilibiliUserUploadedVideosResponse, ApiCallingError> => {
    const params = getWbiEncodedParams(
      {
        mid: mid.toString(),
        pn: pn.toString(),
        ps: '30',
      },
      getCookie(),
    )

    return params.andThen((params) => {
      return bilibiliApiClient.get<BilibiliUserUploadedVideosResponse>(
        '/x/space/wbi/arc/search',
        params,
        getCookie(),
      )
    })
  },
})

export type BilibiliApi = ReturnType<typeof createBilibiliApi>
