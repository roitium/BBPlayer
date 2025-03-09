import { create } from 'zustand'
import TrackPlayer, {
  type Track as RNTPTrack,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  Capability,
  Event,
} from 'react-native-track-player'
import { bilibiliApi } from '../api/bilibili/bilibili'
import type { Track } from '@/types/core/media'
import { middleware } from 'zustand-expo-devtools'

// 音频流过期时间（毫秒）
const STREAM_EXPIRY_TIME = 120 * 60 * 1000 // 120分钟

// ==================== 辅助函数 ====================

const logDebug = (message: string, data?: unknown) => {
  console.log(`[Player Debug] ${message}`, data ? data : '')
}

const logError = (message: string, error: unknown) => {
  console.error(`[Player Error] ${message}`, error)
}

// 增强版调试日志，包含时间戳
const logDetailedDebug = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString()
  console.log(`[Player Debug ${timestamp}] ${message}`, data ? data : '')
}

// 将我们的Track类型转换为react-native-track-player的Track类型
const convertToRNTPTrack = (track: Track): RNTPTrack => {
  logDetailedDebug('转换Track为RNTPTrack', {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    source: track.source,
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
  }

  const rnTrack = {
    id: track.id,
    url,
    title: track.title,
    artist: track.artist,
    artwork: track.cover,
    duration: track.duration,
  }

  logDetailedDebug('RNTPTrack转换完成', rnTrack)
  return rnTrack
}

// ==================== 类型定义 ====================

// 播放器状态接口
interface PlayerState {
  // 队列相关
  queue: Track[]
  currentIndex: number
  currentTrack: Track | null

  // 播放状态
  isPlaying: boolean
  isBuffering: boolean
  repeatMode: 'off' | 'track' | 'queue'
  shuffleMode: boolean
}

// 播放器操作接口
interface PlayerActions {
  // 初始化
  initPlayer: () => Promise<void>

  // 队列操作
  addToQueue: (tracks: Track[]) => Promise<void>
  clearQueue: () => Promise<void>

  // 播放控制
  togglePlay: () => Promise<void>
  skipToNext: () => Promise<void>
  skipToPrevious: () => Promise<void>
  seekTo: (position: number) => Promise<void>

  // 模式控制
  toggleRepeatMode: () => void
  toggleShuffleMode: () => void

  // 音频流处理
  checkAndUpdateAudioStream: (track: Track) => Promise<Track>
}

// 完整的播放器存储类型
type PlayerStore = PlayerState & PlayerActions

// ==================== 音频流处理 ====================

// 音频流处理对象
const AudioStreamHandler = {
  // 检查并更新音频流
  async checkAndUpdateAudioStream(
    track: Track,
  ): Promise<{ track: Track; needsUpdate: boolean }> {
    logDetailedDebug('开始检查并更新音频流', {
      trackId: track.id,
      title: track.title,
      source: track.source,
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
          const bvid = track.id
          let cid = track.cid
          if (!cid) {
            logDetailedDebug('获取视频分P列表', { bvid })
            const pageList = await bilibiliApi.getPageList(bvid)
            logDetailedDebug('分P列表获取成功', {
              bvid,
              pageCount: pageList.length,
              pages: pageList.map((p) => ({
                cid: p.cid,
                page: p.page,
                title: p.part,
              })),
            })

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
          streamUrl: track.biliStreamUrl?.url,
          getTime: track.biliStreamUrl
            ? new Date(track.biliStreamUrl.getTime).toISOString()
            : 'N/A',
        })
      }
    }

    return { track, needsUpdate: false }
  },
}

// ==================== 播放器逻辑 ====================

// 播放器逻辑对象
const PlayerLogic = {
  // 初始化播放器
  async initPlayer(): Promise<void> {
    logDetailedDebug('开始初始化播放器')
    try {
      logDetailedDebug('设置播放器配置')
      await TrackPlayer.setupPlayer({
        minBuffer: 15,
        maxBuffer: 50,
        backBuffer: 30,
        waitForBuffer: true,
      })
      logDetailedDebug('播放器配置设置完成')

      // 设置播放器能力
      logDetailedDebug('开始设置播放器能力')
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1,
      })
      logDetailedDebug('播放器能力设置完成')
    } catch (error: unknown) {
      logError('初始化播放器失败', error)
    }
  },

  // 设置事件监听器
  setupEventListeners(getStore: () => PlayerStore): void {
    logDetailedDebug('开始设置事件监听器')

    // 监听播放状态变化
    logDetailedDebug('设置播放状态变化监听器')
    TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (data: { state: TrackPlayerState }) => {
        const { state } = data
        const store = getStore() // 获取最新的 store 状态

        // 获取状态名称用于日志
        const stateName =
          Object.keys(TrackPlayerState).find(
            (key) =>
              TrackPlayerState[key as keyof typeof TrackPlayerState] === state,
          ) || state.toString()

        logDetailedDebug('播放状态变化', {
          stateValue: state,
          stateName,
          currentTrack: store.currentTrack?.title,
        })

        if (state === TrackPlayerState.Playing) {
          logDetailedDebug('播放状态: 播放中', {
            trackId: store.currentTrack?.id,
            title: store.currentTrack?.title,
          })
          store.isPlaying = true
          store.isBuffering = false
        } else if (
          state === TrackPlayerState.Paused ||
          state === TrackPlayerState.Stopped
        ) {
          logDetailedDebug('播放状态: 暂停/停止', {
            state: stateName,
            trackId: store.currentTrack?.id,
            title: store.currentTrack?.title,
          })
          store.isPlaying = false
          store.isBuffering = false
        } else if (
          state === TrackPlayerState.Buffering ||
          state === TrackPlayerState.Loading
        ) {
          logDetailedDebug('播放状态: 缓冲中/加载中', {
            state: stateName,
            trackId: store.currentTrack?.id,
            title: store.currentTrack?.title,
          })
          store.isBuffering = true
        }
      },
    )
    logDetailedDebug('播放状态变化监听器设置完成')

    // 监听播放完成
    logDetailedDebug('设置播放完成监听器')
    TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async (data: { position: number; track: number }) => {
        const { position, track } = data
        const store = getStore() // 获取最新的 store 状态
        const { repeatMode, queue, currentIndex } = store

        logDetailedDebug('播放队列结束', {
          position,
          trackIndex: track,
          repeatMode,
          currentIndex,
          currentTrack: store.currentTrack?.title,
          queueLength: queue.length,
        })

        if (repeatMode === 'track') {
          // 单曲循环
          logDetailedDebug('单曲循环: 重新播放当前曲目', {
            trackId: store.currentTrack?.id,
            title: store.currentTrack?.title,
          })
          await TrackPlayer.seekTo(0)
          await TrackPlayer.play()
        } else if (
          repeatMode === 'queue' &&
          currentIndex === queue.length - 1
        ) {
          // 队列循环且是最后一首
          logDetailedDebug('队列循环: 从头开始播放队列')
          const firstTrack = queue[0]
          if (firstTrack) {
            logDetailedDebug('开始播放队列第一首', {
              trackId: firstTrack.id,
              title: firstTrack.title,
            })
            await TrackPlayer.skip(0)
          } else {
            logDetailedDebug('队列为空，无法从头开始播放')
          }
        } else {
          logDetailedDebug('播放结束，不循环')
        }
      },
    )
    logDetailedDebug('播放完成监听器设置完成')

    logDetailedDebug('所有事件监听器设置完成')
  },
}

// ==================== Zustand Store ====================

export const usePlayerStore = create<PlayerStore>((set, get) => {
  logDetailedDebug('创建播放器状态存储')

  // 初始状态
  const initialState: PlayerState = {
    queue: [],
    currentIndex: -1,
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    repeatMode: 'off',
    shuffleMode: false,
  }

  logDetailedDebug('初始化播放器状态', initialState)

  // 创建store
  const store: PlayerStore = {
    ...initialState,

    // 初始化播放器
    initPlayer: async () => {
      logDetailedDebug('调用 initPlayer()')
      await PlayerLogic.initPlayer()
      PlayerLogic.setupEventListeners(() => get())
      logDetailedDebug('播放器初始化完成')
    },

    // 添加到队列
    addToQueue: async (tracks: Track[]) => {
      logDetailedDebug('调用 addToQueue()', {
        tracksCount: tracks.length,
        tracks: tracks.map((t) => ({ id: t.id, title: t.title })),
      })

      try {
        const { queue } = get()
        logDetailedDebug('当前队列状态', {
          queueLength: queue.length,
          currentIndex: get().currentIndex,
          currentTrack: get().currentTrack?.title,
        })

        // 过滤重复ID
        const newQueue = [...queue, ...tracks].filter(
          (track, index, self) =>
            index === self.findIndex((t) => t.id === track.id),
        )

        logDetailedDebug('过滤后的新队列', {
          oldLength: queue.length,
          newLength: newQueue.length,
          addedTracks: newQueue.length - queue.length,
        })

        // 检查并更新音频流
        logDetailedDebug('开始批量检查并更新音频流', {
          tracksCount: tracks.length,
        })
        const tracksWithStream = await Promise.all(
          tracks.map((track) => get().checkAndUpdateAudioStream(track)),
        )
        logDetailedDebug('批量音频流更新完成')

        // 转换为RNTPTrack并添加到播放队列
        logDetailedDebug('转换为RNTPTrack并添加到播放队列')
        const rnTracks = tracksWithStream.map(convertToRNTPTrack)
        await TrackPlayer.add(rnTracks)
        logDetailedDebug('曲目已添加到TrackPlayer队列', {
          tracksCount: rnTracks.length,
        })

        set({ queue: newQueue })
        logDetailedDebug('状态已更新：队列已更新', {
          newQueueLength: newQueue.length,
        })

        // 如果当前没有播放中的曲目，自动播放第一首
        if (queue.length === 0 && tracks.length > 0) {
          logDetailedDebug('队列之前为空，自动播放第一首', {
            trackId: tracks[0].id,
            title: tracks[0].title,
          })
          await TrackPlayer.skip(0)
          await TrackPlayer.play()
          set({ isPlaying: true, currentIndex: 0, currentTrack: tracks[0] })
        }
      } catch (error) {
        logError('添加到队列失败', error)
      }
    },

    // 切换播放/暂停
    togglePlay: async () => {
      const { isPlaying, currentTrack } = get()
      logDetailedDebug('调用 togglePlay()', {
        isPlaying,
        currentTrack: currentTrack?.title,
        currentIndex: get().currentIndex,
      })

      try {
        if (isPlaying) {
          logDetailedDebug('当前正在播放，执行暂停')
          await TrackPlayer.pause()
        } else {
          logDetailedDebug('当前已暂停，执行播放')
          await TrackPlayer.play()
        }

        set({ isPlaying: !isPlaying })
        logDetailedDebug('状态已更新：isPlaying =', !isPlaying)
      } catch (error) {
        logError('切换播放状态失败', error)
      }
    },

    // 下一曲
    skipToNext: async () => {
      const { queue, currentIndex, shuffleMode, repeatMode } = get()
      logDetailedDebug('调用 skipToNext()', {
        queueLength: queue.length,
        currentIndex,
        shuffleMode,
        repeatMode,
        currentTrack: get().currentTrack?.title,
      })

      try {
        if (queue.length <= 1) {
          logDetailedDebug('队列中只有一首或没有曲目，无法跳转')
          return
        }

        if (shuffleMode) {
          // 随机模式下随机选择一首（不重复当前曲目）
          logDetailedDebug('随机模式：随机选择下一曲')
          let randomIndex: number
          do {
            randomIndex = Math.floor(Math.random() * queue.length)
          } while (randomIndex === currentIndex && queue.length > 1)

          logDetailedDebug('随机选择的索引', {
            randomIndex,
            trackId: queue[randomIndex].id,
            title: queue[randomIndex].title,
          })
          await TrackPlayer.skip(randomIndex)
          set({
            isPlaying: true,
            currentIndex: randomIndex,
            currentTrack: queue[randomIndex],
          })
        } else {
          // 顺序模式
          logDetailedDebug('顺序模式：跳转到下一曲')
          // 如果当前曲目是最后一首，则跳转到第一首
          if (currentIndex === queue.length - 1) {
            await TrackPlayer.skip(0)
          } else {
            await TrackPlayer.skipToNext()
          }

          // 更新当前索引和曲目
          const nowIndex = await TrackPlayer.getActiveTrackIndex()
          logDetailedDebug('新的活动轨道索引', { nowIndex })

          if (nowIndex !== null && nowIndex !== undefined) {
            const track = queue[nowIndex]
            if (track) {
              set({ currentIndex: nowIndex, currentTrack: track })
              logDetailedDebug('状态已更新：当前索引和曲目已更新', {
                nowIndex,
                trackTitle: track.title,
              })
            } else {
              logDetailedDebug('警告：在队列中找不到对应索引的曲目', {
                nowIndex,
                queueLength: queue.length,
              })
            }
          } else {
            logDetailedDebug('警告：无法获取活动轨道索引')
          }
        }
      } catch (error) {
        logError('跳转到下一曲失败', error)
      }
    },

    // 上一曲
    skipToPrevious: async () => {
      const { queue, currentIndex, shuffleMode } = get()
      logDetailedDebug('调用 skipToPrevious()', {
        queueLength: queue.length,
        currentIndex,
        shuffleMode,
        currentTrack: get().currentTrack?.title,
      })

      try {
        if (queue.length <= 1) {
          logDetailedDebug('队列中只有一首或没有曲目，无法跳转')
          return
        }

        if (shuffleMode) {
          // 随机模式下随机选择一首（不重复当前曲目）
          logDetailedDebug('随机模式：随机选择上一曲')
          let randomIndex: number
          do {
            randomIndex = Math.floor(Math.random() * queue.length)
          } while (randomIndex === currentIndex && queue.length > 1)

          logDetailedDebug('随机选择的索引', {
            randomIndex,
            trackId: queue[randomIndex].id,
            title: queue[randomIndex].title,
          })
          await TrackPlayer.skip(randomIndex)
          set({
            isPlaying: true,
            currentIndex: randomIndex,
            currentTrack: queue[randomIndex],
          })
        } else {
          // 顺序模式
          logDetailedDebug('顺序模式：跳转到上一曲')
          // 如果当前曲目是第一首，则跳转到最后一首
          if (currentIndex === 0) {
            await TrackPlayer.skip(queue.length - 1)
          } else {
            await TrackPlayer.skipToPrevious()
          }

          // 更新当前索引和曲目
          const nowIndex = await TrackPlayer.getActiveTrackIndex()
          logDetailedDebug('新的活动轨道索引', { nowIndex })

          if (nowIndex !== null && nowIndex !== undefined) {
            const track = queue[nowIndex]
            if (track) {
              set({ currentIndex: nowIndex, currentTrack: track })
              logDetailedDebug('状态已更新：当前索引和曲目已更新', {
                nowIndex,
                trackTitle: track.title,
              })
            } else {
              logDetailedDebug('警告：在队列中找不到对应索引的曲目', {
                nowIndex,
                queueLength: queue.length,
              })
            }
          } else {
            logDetailedDebug('警告：无法获取活动轨道索引')
          }
        }
      } catch (error) {
        logError('跳转到上一曲失败', error)
      }
    },

    // 跳转到指定位置
    seekTo: async (position: number) => {
      logDetailedDebug('调用 seekTo()', {
        position,
        currentTrack: get().currentTrack?.title,
        currentIndex: get().currentIndex,
      })

      try {
        await TrackPlayer.seekTo(position)
        logDetailedDebug('跳转成功', { position })
      } catch (error) {
        logError('跳转到指定位置失败', error)
      }
    },

    // 切换重复模式
    toggleRepeatMode: () => {
      const { repeatMode } = get()
      logDetailedDebug('调用 toggleRepeatMode()', { currentMode: repeatMode })

      let newMode: 'off' | 'track' | 'queue'
      if (repeatMode === 'off') {
        newMode = 'track'
      } else if (repeatMode === 'track') {
        newMode = 'queue'
      } else {
        newMode = 'off'
      }

      set({ repeatMode: newMode })
      logDetailedDebug('状态已更新：重复模式已更改', { newMode })
    },

    // 切换随机模式
    toggleShuffleMode: () => {
      const { shuffleMode } = get()
      logDetailedDebug('调用 toggleShuffleMode()', { currentMode: shuffleMode })

      set({ shuffleMode: !shuffleMode })
      logDetailedDebug('状态已更新：随机模式已更改', { newMode: !shuffleMode })
    },

    // 清空队列
    clearQueue: async () => {
      logDetailedDebug('调用 clearQueue()', {
        currentQueueLength: get().queue.length,
        currentTrack: get().currentTrack?.title,
      })

      try {
        logDetailedDebug('重置播放器')
        await TrackPlayer.reset()

        set({
          queue: [],
          currentIndex: -1,
          currentTrack: null,
          isPlaying: false,
        })
        logDetailedDebug('状态已更新：队列已清空，播放器已重置')
      } catch (error) {
        logError('清空队列失败', error)
      }
    },

    // 检查并更新音频流
    checkAndUpdateAudioStream: async (track: Track): Promise<Track> => {
      logDetailedDebug('调用 checkAndUpdateAudioStream()', {
        trackId: track.id,
        title: track.title,
        source: track.source,
      })

      const updatedTrack =
        await AudioStreamHandler.checkAndUpdateAudioStream(track)

      if (!updatedTrack.needsUpdate) {
        logDetailedDebug('音频流不需要更新', {
          trackId: track.id,
          title: track.title,
        })
        return track
      }

      // 如果是当前播放的曲目，需要更新播放器
      // 不存在播放时音频流中途过期的情况，不需要更新
      // const { currentTrack } = get()
      // if (currentTrack && currentTrack.id === track.id) {
      //   logDetailedDebug('直接替换当前播放曲目的音频流', {
      //     trackId: updatedTrack.track.id,
      //     title: updatedTrack.track.title,
      //   })

      //   // 更新当前播放的曲目
      //   await TrackPlayer.updateNowPlayingMetadata({
      //     ...convertToRNTPTrack(updatedTrack.track),
      //   })
      //   logDetailedDebug('当前播放曲目元数据已更新')
      // }

      return updatedTrack.track
    },
  }

  return store
})

middleware(usePlayerStore)

// 导出一些有用的hooks
export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
