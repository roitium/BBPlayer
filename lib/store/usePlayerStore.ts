import { create } from 'zustand'
import TrackPlayer, {
  type Track as RNTPTrack,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player'
import useAppStore from './useAppStore'
import type { Track } from '@/types/core/media'
import { middleware } from 'zustand-expo-devtools'
import { produce } from 'immer'

// 音频流过期时间（毫秒）
const STREAM_EXPIRY_TIME = 120 * 60 * 1000 // 120分钟
const LAZY_LOAD_TRACK_COUNT = 3 // 每次惰性加载的曲目数量

// ==================== 辅助函数 ====================

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
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    headers: {
      referer: 'https://www.bilibili.com',
    },
  }

  logDetailedDebug('RNTPTrack转换完成', rnTrack)
  return rnTrack
}

// ==================== 类型定义 ====================

// 播放器状态接口
interface PlayerState {
  // 队列相关
  queue: Track[] // 我们自己维护的队列
  rntpQueue: RNTPTrack[] // react-native-track-player 内部的队列
  currentIndex: number // 我们自己维护的队列的当前播放索引
  currentRntpIndex: number // rntp 内部队列的当前播放索引
  currentTrack: Track | null

  // 播放状态
  isPlaying: boolean
  isBuffering: boolean
  repeatMode: RepeatMode
  shuffleMode: boolean
  shuffledQueue: Track[] // 存储 shuffle 后的队列
}

// 播放器操作接口
interface PlayerActions {
  // 初始化
  initPlayer: () => Promise<void>

  // 队列操作
  addToQueue: (tracks: Track[], playNow?: boolean) => Promise<void>
  clearQueue: () => Promise<void>
  skipToTrack: (index: number) => Promise<void> // 新增方法：跳转到指定曲目

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
  lazyLoadTracks: () => Promise<void> // 新增方法：惰性加载音频流
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
        const store = getStore()

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
        const { repeatMode, queue, currentIndex, shuffledQueue, shuffleMode } =
          store

        logDetailedDebug('播放队列结束', {
          position,
          trackIndex: track,
          repeatMode,
          currentIndex,
          currentTrack: store.currentTrack?.title,
          queueLength: queue.length,
          shuffledQueueLength: shuffledQueue.length,
        })

        // 根据不同的模式进行处理
        if (repeatMode === RepeatMode.Track) {
          logDetailedDebug('单曲循环模式，重新播放当前曲目')
          // RNTP 可以自己处理单曲循环，我们啥也不用做
        } else if (repeatMode === RepeatMode.Queue) {
          logDetailedDebug('列表循环模式')
          const nextIndex =
            (currentIndex + 1) %
            (shuffleMode ? shuffledQueue.length : queue.length) // 计算下一个索引
          // 惰性加载
          await store.lazyLoadTracks()
          await store.skipToTrack(nextIndex)
        } else {
          // repeatMode === RepeatMode.Off
          logDetailedDebug('无循环模式')
          if (
            currentIndex <
            (shuffleMode ? shuffledQueue.length : queue.length) - 1
          ) {
            // 如果不是最后一首，则播放下一首
            const nextIndex = currentIndex + 1
            // 惰性加载
            await store.lazyLoadTracks()
            await store.skipToTrack(nextIndex)
          } else {
            logDetailedDebug('播放列表已结束，且无循环')
            // 播放完毕，停止播放
            await TrackPlayer.pause()
            store.isPlaying = false
          }
        }
      },
    )

    // 监听播放错误
    logDetailedDebug('设置播放错误监听器')
    TrackPlayer.addEventListener(
      Event.PlaybackError,
      async (data: { code: string; message: string }) => {
        logError('播放错误', data)
        const nowTrack = getStore().currentTrack
        if (nowTrack) {
          logDetailedDebug('当前播放的曲目', {
            trackId: nowTrack.id,
            title: nowTrack.title,
          })
          const track = await getStore().checkAndUpdateAudioStream(nowTrack)
          if (track) {
            logDetailedDebug('更新音频流成功', {
              trackId: track.id,
              title: track.title,
            })
            // 使用 load 方法替换当前曲目
            await TrackPlayer.load(convertToRNTPTrack(track))
          }
        }
      },
    )
    logDetailedDebug('播放错误监听器设置完成')

    logDetailedDebug('所有事件监听器设置完成')
  },
}

// ==================== Zustand Store ====================

export const usePlayerStore = create<PlayerStore>((set, get) => {
  logDetailedDebug('创建播放器状态存储')

  // 初始状态
  const initialState: PlayerState = {
    queue: [],
    rntpQueue: [],
    currentIndex: -1,
    currentRntpIndex: -1,
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    repeatMode: RepeatMode.Off,
    shuffleMode: false,
    shuffledQueue: [],
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
    addToQueue: async (tracks: Track[], playNow = false) => {
      logDetailedDebug('调用 addToQueue()', {
        tracksCount: tracks.length,
        tracks: tracks.map((t) => ({ id: t.id, title: t.title })),
        playNow,
      })

      set(
        produce((state: PlayerState) => {
          logDetailedDebug('当前队列状态', {
            queueLength: state.queue.length,
            currentIndex: state.currentIndex,
            currentTrack: state.currentTrack?.title,
          })

          // 过滤重复ID
          const newTracks = tracks.filter(
            (track) => !state.queue.some((t) => t.id === track.id),
          )

          // 如果 playNow 为 true，则将新曲目插入到当前播放曲目的后面，否则添加到队列末尾
          if (playNow) {
            logDetailedDebug('立即播放模式，插入到当前播放曲目之后')
            const insertIndex = state.currentIndex + 1
            state.queue.splice(insertIndex, 0, ...newTracks)

            // 更新当前索引和曲目
            state.currentIndex = insertIndex
            state.currentTrack = newTracks[0] // 假设 newTracks 至少有一个元素
          } else {
            // 添加到队列末尾
            logDetailedDebug('添加到队列末尾')
            state.queue.push(...newTracks)
          }

          logDetailedDebug('过滤后的新队列', {
            oldLength: state.queue.length - newTracks.length,
            newLength: state.queue.length,
            addedTracks: newTracks.length,
          })

          // 如果是首次添加，且没有正在播放的曲目, 则把第一首曲目设为当前曲目
          if (state.queue.length > 0 && state.currentTrack === null) {
            logDetailedDebug('队列之前为空，把第一首设为当前曲目', {
              trackId: state.queue[0].id,
              title: state.queue[0].title,
            })
            state.currentIndex = 0
            state.currentTrack = state.queue[0]
          }
        }),
      )
      // 惰性加载
      console.log(get().skipToPrevious)
      await get().lazyLoadTracks()
    },

    // 惰性加载音频流
    lazyLoadTracks: async () => {
      logDetailedDebug('调用 lazyLoadTracks()')
      const { queue, rntpQueue, currentIndex, shuffleMode, shuffledQueue } =
        get()

      // 确定要加载的曲目范围
      const currentQueue = shuffleMode ? shuffledQueue : queue
      const start = rntpQueue.length // 从 rntpQueue 的末尾开始
      const end = Math.min(start + LAZY_LOAD_TRACK_COUNT, currentQueue.length) // 最多加载 LAZY_LOAD_TRACK_COUNT 首

      logDetailedDebug('惰性加载范围', {
        start,
        end,
        currentRntpQueueLength: rntpQueue.length,
        currentQueueLength: currentQueue.length,
      })

      if (start >= end) {
        logDetailedDebug('无需加载更多曲目')
        return
      }
      const tracksToLoad = currentQueue.slice(start, end)

      // 检查并更新音频流
      logDetailedDebug('开始批量检查并更新音频流', {
        tracksCount: tracksToLoad.length,
      })
      const tracksWithStream = await Promise.all(
        tracksToLoad.map((track) => get().checkAndUpdateAudioStream(track)),
      )
      logDetailedDebug('批量音频流更新完成')

      // 转换为RNTPTrack并添加到播放队列
      logDetailedDebug('转换为RNTPTrack并添加到TrackPlayer队列')
      const rnTracks = tracksWithStream.map((item) => convertToRNTPTrack(item))
      await TrackPlayer.add(rnTracks)

      // 更新 rntpQueue
      set(
        produce((state: PlayerState) => {
          state.rntpQueue.push(...rnTracks)
        }),
      )

      logDetailedDebug('曲目已添加到TrackPlayer队列', {
        tracksCount: rnTracks.length,
        newRntpQueueLength: get().rntpQueue.length,
      })
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
      const { queue, currentIndex, shuffleMode, repeatMode, shuffledQueue } =
        get()
      logDetailedDebug('调用 skipToNext()', {
        queueLength: queue.length,
        currentIndex,
        shuffleMode,
        repeatMode,
        currentTrack: get().currentTrack?.title,
      })

      try {
        const currentQueue = shuffleMode ? shuffledQueue : queue

        if (currentQueue.length <= 1) {
          logDetailedDebug('队列中只有一首或没有曲目，无法跳转')
          return
        }

        let nextIndex: number

        if (shuffleMode) {
          // 随机模式下随机选择一首（不重复当前曲目）
          logDetailedDebug('随机模式：随机选择下一曲')
          do {
            nextIndex = Math.floor(Math.random() * currentQueue.length)
          } while (nextIndex === currentIndex && currentQueue.length > 1)
          logDetailedDebug('随机选择的索引', {
            nextIndex,
            trackId: currentQueue[nextIndex].id,
            title: currentQueue[nextIndex].title,
          })
        } else {
          // 顺序模式
          logDetailedDebug('顺序模式：跳转到下一曲')
          // 如果当前曲目是最后一首，则跳转到第一首（循环）
          nextIndex = (currentIndex + 1) % currentQueue.length
        }
        // 惰性加载
        await get().lazyLoadTracks()
        await get().skipToTrack(nextIndex)
      } catch (error) {
        logError('跳转到下一曲失败', error)
      }
    },

    // 上一曲
    skipToPrevious: async () => {
      const { queue, currentIndex, shuffleMode, shuffledQueue } = get()
      logDetailedDebug('调用 skipToPrevious()', {
        queueLength: queue.length,
        currentIndex,
        shuffleMode,
        currentTrack: get().currentTrack?.title,
      })

      try {
        const currentQueue = shuffleMode ? shuffledQueue : queue

        if (currentQueue.length <= 1) {
          logDetailedDebug('队列中只有一首或没有曲目，无法跳转')
          return
        }

        let previousIndex: number

        if (shuffleMode) {
          // 随机模式下随机选择一首（不重复当前曲目）
          logDetailedDebug('随机模式：随机选择上一曲')
          do {
            previousIndex = Math.floor(Math.random() * currentQueue.length)
          } while (previousIndex === currentIndex && currentQueue.length > 1)

          logDetailedDebug('随机选择的索引', {
            previousIndex,
            trackId: currentQueue[previousIndex].id,
            title: currentQueue[previousIndex].title,
          })
        } else {
          // 顺序模式
          logDetailedDebug('顺序模式：跳转到上一曲')
          // 如果当前曲目是第一首，则跳转到最后一首
          previousIndex =
            currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1
        }
        // 惰性加载
        await get().lazyLoadTracks()
        await get().skipToTrack(previousIndex)
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
    toggleRepeatMode: async () => {
      const { repeatMode } = get()
      logDetailedDebug('调用 toggleRepeatMode()', {
        currentMode: repeatMode,
      })

      let newMode: RepeatMode
      if (repeatMode === RepeatMode.Off) {
        newMode = RepeatMode.Track
      } else if (repeatMode === RepeatMode.Track) {
        newMode = RepeatMode.Queue
      } else {
        newMode = RepeatMode.Off
      }
      await TrackPlayer.setRepeatMode(newMode)
      set({ repeatMode: newMode })
      logDetailedDebug('状态已更新：重复模式已更改', { newMode })
    },

    // 切换随机模式
    toggleShuffleMode: () => {
      const { shuffleMode, queue, currentIndex } = get()
      logDetailedDebug('调用 toggleShuffleMode()', { currentMode: shuffleMode })

      if (shuffleMode) {
        // 关闭随机模式，恢复原始队列
        logDetailedDebug('关闭随机模式，恢复原始队列')
        set(
          produce((state: PlayerState) => {
            state.shuffleMode = false
            // 找到当前播放曲目在原始队列中的索引
            if (state.currentTrack) {
              state.currentIndex = state.queue.findIndex(
                (track) => track.id === state.currentTrack?.id,
              )
            }
            state.shuffledQueue = []
          }),
        )
      } else {
        // 开启随机模式，打乱队列
        logDetailedDebug('开启随机模式，打乱队列')

        const shuffledQueue = [...queue] // 创建队列的副本
        // Fisher-Yates 洗牌算法(网上抄的)
        for (let i = shuffledQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledQueue[i], shuffledQueue[j]] = [
            shuffledQueue[j],
            shuffledQueue[i],
          ]
        }

        // 确保当前播放的歌曲在打乱后的队列中位置不变
        const currentTrackIndex = shuffledQueue.findIndex(
          (track) => track.id === queue[currentIndex].id,
        )
        if (currentTrackIndex !== -1) {
          ;[shuffledQueue[0], shuffledQueue[currentTrackIndex]] = [
            shuffledQueue[currentTrackIndex],
            shuffledQueue[0],
          ]
        }

        set(
          produce((state: PlayerState) => {
            state.shuffleMode = true
            state.shuffledQueue = shuffledQueue
            state.currentIndex = 0 // 重置索引为0，因为当前播放的歌曲现在是打乱后队列的第一首
          }),
        )
      }
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
          rntpQueue: [],
          currentIndex: -1,
          currentRntpIndex: -1,
          currentTrack: null,
          isPlaying: false,
          shuffledQueue: [],
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
      const { track: updatedTrack, needsUpdate } =
        await AudioStreamHandler.checkAndUpdateAudioStream(track)
      return updatedTrack
    },

    // 跳转到指定曲目
    skipToTrack: async (index: number) => {
      const { queue, shuffleMode, shuffledQueue } = get()
      const currentQueue = shuffleMode ? shuffledQueue : queue

      logDetailedDebug('调用 skipToTrack()', {
        index,
        queueLength: queue.length,
        shuffledQueueLength: shuffledQueue.length,
        shuffleMode,
        currentTrack: get().currentTrack?.title,
      })

      if (index < 0 || index >= currentQueue.length) {
        logDetailedDebug('索引超出范围', { index })
        return
      }

      const track = currentQueue[index]
      if (!track) {
        logDetailedDebug('未找到指定索引的曲目', { index })
        return
      }
      // 找到 rntp 内部队列中对应的 track 的 index
      const rntpIndex = get().rntpQueue.findIndex((t) => t.id === track.id)
      logDetailedDebug('rntp 内部队列索引', { rntpIndex, trackId: track.id })

      if (rntpIndex === -1) {
        logDetailedDebug('未在 rntp 队列中找到对应曲目，可能未加载', {
          trackId: track.id,
          index,
        })
        return
      }

      await TrackPlayer.skip(rntpIndex)
      // await TrackPlayer.play() // 确保开始播放

      // 更新状态
      set(
        produce((state: PlayerState) => {
          state.currentIndex = index
          state.currentRntpIndex = rntpIndex
          state.currentTrack = track
          state.isPlaying = true // 设置播放状态为 true
        }),
      )

      logDetailedDebug('已跳转到指定曲目', {
        index,
        trackTitle: track.title,
        rntpIndex,
      })
    },
  }

  return store
})

middleware(usePlayerStore)

// 导出一些有用的hooks
export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
