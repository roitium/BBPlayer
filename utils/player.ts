import type { Track } from '@/types/core/media'
import type { Track as RNTPTrack } from 'react-native-track-player'
import { logDetailedDebug, logError } from './log'
import { STREAM_EXPIRY_TIME } from '@/constants/player'
import useAppStore from '@/lib/store/useAppStore'

// 将我们的Track类型转换为react-native-track-player的Track类型
function convertToRNTPTrack(track: Track): RNTPTrack {
  logDetailedDebug('转换Track为RNTPTrack', {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
  })

  // 根据音频来源选择URL
  let url = ''
  if (track.source === 'bilibili' && track.biliStreamUrl) {
    url = track.biliStreamUrl.url
    logDetailedDebug('使用B站音频流URL', {
      url,
      quality: track.biliStreamUrl.quality,
    })
  } else if (track.source === 'local' && track.localStreamUrl) {
    url = track.localStreamUrl
    logDetailedDebug('使用本地音频流URL', { url })
  } else {
    logDetailedDebug('警告：没有找到有效的音频流URL', { source: track.source })
    throw new Error('没有找到有效的音频流URL')
  }

  const rnTrack = {
    id: track.id,
    url,
    title: track.title,
    artist: track.artist,
    artwork: track.cover,
    duration: track.duration,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    headers: {
      referer: 'https://www.bilibili.com',
    },
  }

  logDetailedDebug('RNTPTrack转换完成', rnTrack)
  return rnTrack
}

async function checkAndUpdateAudioStream(
  track: Track,
): Promise<{ track: Track; needsUpdate: boolean }> {
  logDetailedDebug('开始检查并更新音频流', {
    trackId: track.id,
    title: track.title,
  })

  // 如果是本地音频，直接返回
  if (track.source === 'local') {
    logDetailedDebug('本地音频，无需更新流', { trackId: track.id })
    return { track, needsUpdate: false }
  }

  // 如果是B站音频，检查是否需要更新流
  if (track.source === 'bilibili') {
    const now = Date.now()

    // 检查是否有音频流或音频流是否过期
    const needsUpdate =
      !track.biliStreamUrl ||
      now - track.biliStreamUrl.getTime > STREAM_EXPIRY_TIME

    logDetailedDebug('B站音频流状态检查', {
      trackId: track.id,
      hasStream: !!track.biliStreamUrl,
      streamAge: track.biliStreamUrl
        ? now - track.biliStreamUrl.getTime
        : 'N/A',
      needsUpdate,
      expiryTime: STREAM_EXPIRY_TIME,
    })

    if (needsUpdate) {
      logDetailedDebug('需要更新B站音频流', { trackId: track.id })
      try {
        // 使用 useAppStore 中的 bilibiliApi
        const bilibiliApi = useAppStore.getState().bilibiliApi

        const bvid = track.id
        let cid = track.cid
        if (!cid) {
          logDetailedDebug('获取视频分P列表', { bvid })
          const pageList = await bilibiliApi.getPageList(bvid)
          logDetailedDebug('分P列表获取成功', { pageList })

          // 处理多P视频
          if (pageList.length > 0) {
            cid = pageList[0].cid
            logDetailedDebug('使用第一个分P的cid', { bvid, cid })
          } else {
            logDetailedDebug('警告：视频没有分P信息', { bvid })
          }
        } else {
          logDetailedDebug('使用已有的cid', { bvid, cid })
        }

        // 获取新的音频流
        logDetailedDebug('开始获取音频流', { bvid, cid })
        const streamUrl = await bilibiliApi.getAudioStream({
          bvid,
          cid: cid as number, // 确保 cid 是 number 类型
          audioQuality: 30280,
          enableDolby: false,
          enableHiRes: false,
        })

        if (!streamUrl || !streamUrl.url) {
          logError('获取音频流失败: 没有有效的URL', { streamUrl, bvid, cid })
          return { track, needsUpdate: false }
        }

        logDetailedDebug('音频流获取成功', {
          bvid,
          cid,
          url: streamUrl.url,
          quality: streamUrl.quality,
          type: streamUrl.type,
        })

        // 更新track对象
        const updatedTrack = {
          ...track,
          cid: cid,
          biliStreamUrl: {
            url: streamUrl.url,
            quality: streamUrl.quality || 0,
            getTime: Date.now(),
            type: streamUrl.type || 'dash',
          },
        }

        logDetailedDebug('Track对象已更新音频流信息', {
          trackId: updatedTrack.id,
          title: updatedTrack.title,
          streamUrl: updatedTrack.biliStreamUrl.url,
          getTime: new Date(updatedTrack.biliStreamUrl.getTime).toISOString(),
        })

        return { track: updatedTrack, needsUpdate: true }
      } catch (error: unknown) {
        logError('更新音频流失败', error)
        logDetailedDebug('更新音频流出错，返回原始track', {
          trackId: track.id,
        })
        return { track, needsUpdate: false } // 失败时返回原始track
      }
    } else {
      logDetailedDebug('B站音频流仍然有效，无需更新', {
        trackId: track.id,
        getTime: track.biliStreamUrl
          ? new Date(track.biliStreamUrl.getTime).toISOString()
          : 'N/A',
      })
    }
  }

  return { track, needsUpdate: false }
}

export { convertToRNTPTrack, checkAndUpdateAudioStream }
