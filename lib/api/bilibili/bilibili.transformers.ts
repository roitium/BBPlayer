import type {
  BilibiliFavoriteListContent,
  BilibiliHistoryVideo,
  BilibiliHotSearch,
  BilibiliMediaItem,
  BilibiliMultipageVideo,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { Playlist, Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatMMSSToSeconds } from '@/utils/times'

const bilibiliApiLog = log.extend('BILIBILI_API')

/**
 * 转换B站bvid为avid
 */
export function bv2av(bvid: string): number {
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
 * 将B站历史记录视频列表转换为通用的 Track 格式
 */
export const transformHistoryVideosToTracks = (
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
      createTime: 0, // 该字段不存在于历史记录视频API
      hasMetadata: true,
      isMultiPage: false, // 历史记录视频API不指定是否是分 p 视频
    }))
  } catch (error) {
    bilibiliApiLog.error(
      '将历史记录视频列表转换为通用的 Track 格式失败:',
      error,
    )
    return []
  }
}

/**
 * 将B站视频详细信息列表转换为通用的 Track 格式
 */
export const transformVideoDetailsToTracks = (
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
      isMultiPage: false, // 视频详细信息API不指定是否是分 p 视频
    }))
  } catch (error) {
    bilibiliApiLog.error(
      '将视频详细信息列表转换为通用的 Track 格式失败:',
      error,
    )
    return []
  }
}

/**
 * 将B站收藏夹列表转换为通用的 Playlist 格式
 */
export const transformFavoriteListsToPlaylists = (
  playlists: BilibiliPlaylist[] | null,
): Playlist[] => {
  if (!playlists) return []
  try {
    return playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      count: playlist.media_count,
      cover: '', // 收藏夹列表API不提供收藏夹本身的封面
      source: 'bilibili' as const,
      biliType: 'favorite' as const,
    }))
  } catch (error) {
    bilibiliApiLog.error('将收藏夹列表转换为通用的 Playlist 格式失败:', error)
    return []
  }
}

/**
 * 将B站搜索结果视频列表转换为通用的 Track 格式
 */
export const transformSearchResultsToTracks = (
  videos: BilibiliSearchVideo[],
): Track[] => {
  if (!videos) return []
  try {
    return videos.map((video) => ({
      id: video.bvid,
      title: video.title.replace(/<em[^>]*>|<\/em>/g, ''), // 去除关键字标签
      artist: video.author,
      cover: `https:${video.pic}`,
      source: 'bilibili' as const,
      duration: formatMMSSToSeconds(video.duration),
      createTime: video.senddate,
      hasMetadata: true,
      isMultiPage: false, // 搜索结果API不指定是否是分 p 视频
    }))
  } catch (error) {
    bilibiliApiLog.error(
      '将搜索结果视频列表转换为通用的 Track 格式失败:',
      error,
    )
    return []
  }
}

/**
 * 将B站热门搜索关键词列表转换为通用格式
 */
export const transformHotSearches = (
  hotSearches: BilibiliHotSearch[],
): { id: string; text: string }[] => {
  if (!hotSearches) return []
  try {
    return hotSearches.map((item) => ({
      id: `hot_${item.keyword}`, // 使用关键词作为 id 的部分
      text: item.keyword,
    }))
  } catch (error) {
    bilibiliApiLog.error('将热门搜索关键词列表转换为通用格式失败:', error)
    return []
  }
}

/**
 * 将B站收藏夹内容列表转换为通用的 Track 格式
 */
export const transformFavoriteContentsToTracks = (
  contents: BilibiliFavoriteListContent[] | null,
): Track[] => {
  if (!contents) return []
  try {
    return (
      contents
        // 去除已失效和非视频稿件 (type 2 is video, attr 0 is normal)
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
          isMultiPage: false, // Favorite contents API doesn't indicate multipage
        }))
    )
  } catch (error) {
    bilibiliApiLog.error('将收藏夹内容列表转换为通用的 Track 格式失败:', error)
    return []
  }
}

/**
 * 将B站合集/追番内容列表转换为通用的 Track 格式
 */
export const transformCollectionAllContentsToTracks = (
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
      isMultiPage: false, // Collection contents API doesn't indicate multipage
    }))
  } catch (error) {
    bilibiliApiLog.error('Error transforming collection contents:', error)
    return []
  }
}

/**
 * 将B站分 p 视频数据转换为通用的 Track 格式
 */
export const transformMultipageVideosToTracks = (
  videos: BilibiliMultipageVideo[],
  videoData: BilibiliVideoDetails, // 需要视频的整体信息补充，如作者、发布日期等
): Track[] => {
  if (!videos) return []
  try {
    return videos.map((video) => ({
      // 使用主视频BVID作为整体轨道ID，但保留CID作为分 p 视频的分部标识
      id: videoData.bvid,
      cid: video.cid,
      title: video.part, // Use part name as title for multipage tracks
      artist: videoData.owner.name,
      cover: video.first_frame,
      source: 'bilibili' as const,
      duration: video.duration,
      createTime: videoData.pubdate,
      hasMetadata: true,
      isMultiPage: true,
    }))
  } catch (error) {
    bilibiliApiLog.error('将分 p 视频列表转换为通用的 Track 格式失败:', error)
    return []
  }
}
