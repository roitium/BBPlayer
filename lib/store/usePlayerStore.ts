import { produce } from 'immer'
import { err, ok, type Result } from 'neverthrow'
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player'
import { create } from 'zustand'
import { PRELOAD_TRACKS } from '@/constants/player'
import type { Track } from '@/types/core/media'
import type {
  addToQueueParams,
  PlayerState,
  PlayerStore,
} from '@/types/core/playerStore'
import type { BilibiliApiError } from '@/utils/errors'
import log from '@/utils/log'
import {
  checkAndUpdateAudioStream,
  checkBilibiliAudioExpiry,
  convertToRNTPTrack,
  isTargetTrack,
} from '@/utils/player'
import Toast from '@/utils/toast'
import useAppStore from './useAppStore'

const playerLog = log.extend('PLAYER')
const logDetailedDebug = playerLog.debug
const logError = playerLog.sentry

// 播放器逻辑对象
const PlayerLogic = {
  // 初始化播放器
  async initPlayer(): Promise<void> {
    logDetailedDebug('开始初始化播放器')
    try {
      logDetailedDebug('设置播放器配置')
      const setup = async () => {
        try {
          await TrackPlayer.setupPlayer({
            minBuffer: 15,
            maxBuffer: 50,
            backBuffer: 30,
            waitForBuffer: true,
            autoHandleInterruptions: true,
          })
        } catch (e) {
          return (e as Error & { code?: string }).code
        }
      }
      // 避免在后台初始化播放器失败（虽然这是小概率事件）
      while ((await setup()) === 'android_cannot_setup_player_in_background') {
        await new Promise<void>((resolve) => setTimeout(resolve, 1))
      }
      logDetailedDebug('播放器配置设置完成')

      // 设置播放器能力（怕自己忘了记一下：如果想修改这些能力对应的函数调用，要去 /lib/services/playbackService 里改）
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
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
        },
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        icon: require('../../assets/images/icon.png'),
      })
      logDetailedDebug('播放器能力设置完成')
      // 设置重复模式为 Off
      await TrackPlayer.setRepeatMode(RepeatMode.Off)
    } catch (error: unknown) {
      logError('初始化播放器失败', error)
    }
  },

  // 设置事件监听器
  setupEventListeners(): void {
    logDetailedDebug('开始设置事件监听器')

    // 监听播放状态变化
    logDetailedDebug('设置播放状态变化监听器')
    TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (data: { state: TrackPlayerState }) => {
        const { state } = data
        const store = usePlayerStore.getState()

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
        } else if (state === TrackPlayerState.Ready) {
          logDetailedDebug('播放状态: 就绪', {
            trackId: store.currentTrack?.id,
            title: store.currentTrack?.title,
          })
          store.isBuffering = false
        }
      },
    )
    logDetailedDebug('播放状态变化监听器设置完成')

    // 监听播放完成
    logDetailedDebug('设置播放完成监听器')
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      const store = usePlayerStore.getState() // 获取最新的 store 状态
      const { repeatMode } = store

      logDetailedDebug('播放队列结束（即单曲结束）', {
        repeatMode,
      })

      // 单曲结束后的行为
      if (repeatMode !== RepeatMode.Track) {
        // 如果不是单曲循环，则触发切换到下一首
        logDetailedDebug(
          '当前队列：',
          store.queue.map((track) => track.title),
        )
        await store.skipToNext()
      }
    })

    // 监听播放错误
    logDetailedDebug('设置播放错误监听器')
    TrackPlayer.addEventListener(
      Event.PlaybackError,
      async (data: { code: string; message: string }) => {
        if (data.code === 'android-io-bad-http-status') {
          logDetailedDebug(
            '播放错误：服务器返回了错误状态码，重新加载曲目，但不上报错误',
          )
        } else {
          logError('播放错误', data)
        }
        const nowTrack = usePlayerStore.getState().currentTrack
        if (nowTrack) {
          logDetailedDebug('当前播放的曲目', {
            trackId: nowTrack.id,
            title: nowTrack.title,
          })
          const track = await usePlayerStore
            .getState()
            .patchMetadataAndAudio(nowTrack)
          if (track.isErr()) {
            logError('更新音频流失败', track.error)
            return
          }
          logDetailedDebug('更新音频流成功', {
            trackId: track.value.track.id,
            title: track.value.track.title,
          })
          // 使用 load 方法替换当前曲目
          const rntpTrack = convertToRNTPTrack(track.value.track)
          if (rntpTrack.isErr()) {
            logError('更新音频流失败', rntpTrack.error)
            return
          }
          await TrackPlayer.load(rntpTrack.value)
        }
      },
    )

    logDetailedDebug('所有事件监听器设置完成')
  },
}

const checkPlayerReady = () => {
  if (!global.playerIsReady) {
    Toast.error('播放器未初始化', { description: '请稍后再试' })
    return false
  }
  return true
}

/**
 * 播放器状态存储
 * 采用 zustand 自己维护一个 queue，rntp 仅用于播放当前的 track，通过 TrackPlayer.load 来替换当前播放的内容，所有队列操作都通过该 store 进行
 */
export const usePlayerStore = create<PlayerStore>()((set, get) => {
  logDetailedDebug('创建播放器状态存储')

  // 初始状态
  const initialState: PlayerState = {
    queue: [],
    currentIndex: -1,
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    repeatMode: RepeatMode.Off,
    shuffleMode: false,
    shuffledQueue: [],
  }

  logDetailedDebug('初始化播放器状态', initialState)

  // 创建store
  const store = {
    ...initialState,

    // 初始化播放器
    initPlayer: async () => {
      logDetailedDebug('调用 initPlayer()')
      await PlayerLogic.initPlayer()
      PlayerLogic.setupEventListeners()
      logDetailedDebug('播放器初始化完成')
    },

    // rntpQueue (现在始终返回一个只有一个元素的数组)
    rntpQueue: async () => {
      logDetailedDebug('调用 rntpQueue()')
      const currentTrack = await TrackPlayer.getActiveTrack()
      return currentTrack ? [currentTrack] : []
    },

    removeTrack: async (id: string, cid: number | undefined) => {
      logDetailedDebug('调用 removeTrack()', { id, cid })
      const { queue, shuffledQueue, shuffleMode, currentTrack } = get()
      const currentQueue = shuffleMode ? shuffledQueue : queue
      if (currentTrack?.id === id && currentTrack?.cid === cid) {
        logDetailedDebug('当前正在播放的曲目被删除，判断是否是最后一首')
        if (currentQueue.length === 1) {
          logDetailedDebug('队列只有一首歌曲，清空队列并停止播放')
          set(
            produce((state: PlayerState) => {
              state.queue = []
              state.currentIndex = -1
              state.currentTrack = null
              state.isPlaying = false
              state.shuffledQueue = []
            }),
          )
          await TrackPlayer.stop()
          await TrackPlayer.remove([0])
          return
        }
        const lastTrack = currentQueue.at(-1)
        if (lastTrack) {
          if (lastTrack.id === id && lastTrack.cid === cid) {
            logDetailedDebug('是最后一首，则跳转到上一首')
            await get().skipToPrevious()
          } else {
            logDetailedDebug('不是最后一首，则跳转到下一首')
            await get().skipToNext()
          }
        }
      }
      const queueIndex = queue.findIndex((t) => t.id === id && t.cid === cid)
      if (queueIndex === -1) {
        logDetailedDebug(
          '在队列中找不到该曲目，无法删除，已记录日志并重置播放器',
        )
        Toast.error('播放器异常', {
          description: '在播放列表中找不到该曲目，已重置播放器',
        })
        await get().clearQueue()
        return
      }
      const shuffledQueueIndex = shuffledQueue.findIndex(
        (t) => t.id === id && t.cid === cid,
      )
      // 当没有开启过随机模式时，shuffledQueue 为空，所以在判断 shuffledQueueIndex 时还需要判断列表不为空
      if (shuffledQueueIndex === -1 && shuffledQueue.length > 0) {
        logDetailedDebug(
          '在随机队列中找不到该曲目，无法删除，已上报日志并重置播放器',
        )
        Toast.error('播放器异常', {
          description: '在播放列表中找不到该曲目，已重置播放器',
        })
        await get().clearQueue()
        return
      }
      set(
        produce((state: PlayerState) => {
          state.queue.splice(queueIndex, 1)
          state.shuffledQueue.splice(shuffledQueueIndex, 1)
        }),
      )
    },

    /**
     * 添加多条曲目到队列
     * 当 playNow 为 false 时，startFromId 不生效
     * @param tracks
     * @param playNow 是否立即播放（在 startFromId 为空时是播放新增队列的第一首歌曲）
     * @param clearQueue
     * @param startFromId 从指定 id 开始播放
     * @param startFromCid 从指定 cid 开始播放
     * @param playNext （仅在 playNow 为 false 时）是否把新曲目插入到当前播放曲目的后面
     * @returns
     */
    addToQueue: async ({
      tracks,
      playNow,
      clearQueue,
      startFromId,
      startFromCid,
      playNext,
    }: addToQueueParams) => {
      logDetailedDebug('调用 addToQueue()', {
        tracksCount: tracks.length,
        tracks: tracks.map((t) => ({ id: t.id, title: t.title })),
        playNow,
        startFromId,
        clearQueue,
      })

      if (!checkPlayerReady()) return

      if (clearQueue) {
        await get().clearQueue()
      }

      set(
        produce((state: PlayerState) => {
          logDetailedDebug('当前队列状态', {
            queueLength: state.queue.length,
            currentIndex: state.currentIndex,
            currentTrack: state.currentTrack?.title,
          })

          // 过滤重复ID
          const newTracks = tracks.filter(
            (track) =>
              !state.queue.some((t) => isTargetTrack(t, track.id, track.cid)),
          )

          if (newTracks.length === 0) {
            logDetailedDebug('无新曲目需要添加')
            return
          }

          // playNow 模式下，将新曲目插入到当前播放曲目的后面，否则添加到队列末尾
          if (playNow) {
            logDetailedDebug('立即播放模式，插入到当前播放曲目之后')
            const insertIndex = state.currentIndex + 1
            state.queue.splice(insertIndex, 0, ...newTracks)
            if (startFromCid) {
              let startFromIndex: number
              playerLog.debug(
                '指定了起始 cid，将 currentIndex 和 currentTrack 更新',
              )
              startFromIndex = state.queue.findIndex(
                (t) => t.cid === startFromCid,
              )
              if (startFromIndex !== -1) {
                logDetailedDebug(
                  '指定了起始 cid，将 currentIndex 和 currentTrack 更新',
                  {
                    startFromIndex,
                    startFromId,
                    currentTrack: state.currentTrack?.title,
                  },
                )
                state.currentIndex = startFromIndex
                state.currentTrack = state.queue[startFromIndex]
              }
            } else if (startFromId) {
              let startFromIndex: number
              startFromIndex = state.queue.findIndex(
                (t) => t.id === startFromId,
              )
              if (startFromIndex !== -1) {
                logDetailedDebug(
                  '指定了起始曲目，将 currentIndex 和 currentTrack 更新',
                  {
                    startFromIndex,
                    startFromId,
                    currentTrack: state.currentTrack?.title,
                  },
                )
                state.currentIndex = startFromIndex
                state.currentTrack = state.queue[startFromIndex]
              }
            } else {
              playerLog.debug('更新当前索引和曲目')
              // 更新当前索引和曲目
              state.currentIndex = insertIndex
              state.currentTrack = newTracks[0]
            }
          } else if (playNext) {
            logDetailedDebug('播放模式，插入到当前播放曲目之后')
            const insertIndex = state.currentIndex + 1
            state.queue.splice(insertIndex, 0, ...newTracks)
          } else {
            logDetailedDebug('添加到队列末尾')
            state.queue.push(...newTracks)
          }

          logDetailedDebug('过滤后的新队列', {
            oldLength: state.queue.length - newTracks.length,
            newLength: state.queue.length,
            addedTracks: newTracks.length,
          })

          // 如果没有正在播放的曲目，且 playNow 为 false, 则把第一首曲目设为当前曲目
          // 目的是保证能显示播放栏
          if (
            state.queue.length > 0 &&
            state.currentTrack === null &&
            !playNow
          ) {
            logDetailedDebug('队列之前为空，把第一首设为当前曲目', {
              trackId: state.queue[0].id,
              title: state.queue[0].title,
            })
            state.currentIndex = 0
            state.currentTrack = state.queue[0]
          }
        }),
      )

      // 如果是 playNow，则立即播放
      if (playNow) {
        await get().skipToTrack(get().currentIndex)
        await TrackPlayer.play()
        set({ isPlaying: true })
      }
    },

    // 预加载
    preloadTracks: async (index: number) => {
      const { queue, shuffleMode, shuffledQueue } = get()
      const currentQueue = shuffleMode ? shuffledQueue : queue

      // 预加载当前播放歌曲的后 n 首
      const preloadStartIndex = index + 1
      const preloadEndIndex = Math.min(
        preloadStartIndex + PRELOAD_TRACKS,
        currentQueue.length,
      )
      const tracksToPreload = currentQueue.slice(
        preloadStartIndex,
        preloadEndIndex,
      )

      logDetailedDebug('预加载曲目', {
        preloadStartIndex,
        preloadEndIndex,
        tracksToPreload: tracksToPreload.map((t) => t.title),
      })

      await Promise.all(
        tracksToPreload.map((track) => get().patchMetadataAndAudio(track)),
      )
      logDetailedDebug('预加载完成')
    },

    // 切换播放/暂停
    togglePlay: async () => {
      const {
        isPlaying,
        currentTrack,
        skipToTrack,
        currentIndex,
        rntpQueue,
        patchMetadataAndAudio,
        seekTo,
      } = get()
      logDetailedDebug('调用 togglePlay()', {
        isPlaying,
        currentTrack: currentTrack?.title,
        currentIndex: currentIndex,
      })

      if (!checkPlayerReady()) return

      if (!currentTrack) {
        logDetailedDebug('当前没有播放的曲目，无需操作')
        return
      }

      try {
        if (!(await rntpQueue()).length) {
          logDetailedDebug('队列为空，如果当前有曲目，尝试重新加载')
          if (currentTrack) {
            skipToTrack(currentIndex)
          }
        }
        if (isPlaying) {
          logDetailedDebug('当前正在播放，执行暂停')
          await TrackPlayer.pause()
        } else {
          logDetailedDebug(
            '当前已暂停，即将播放，让我们做些检查看看 track 是否过期',
          )
          const isExpired = checkBilibiliAudioExpiry(currentTrack)
          if (!isExpired) {
            logDetailedDebug('音频流没过期，继续播放')
            await TrackPlayer.play()
            set({ isPlaying: true })
            return
          }
          const result = await patchMetadataAndAudio(currentTrack)
          if (result.isErr()) {
            logError('更新音频流失败', result.error)
            return
          }
          const { needsUpdate, track } = result.value
          if (needsUpdate) {
            // 如果需要更新音频流，则先替换掉当前播放的歌曲，并将播放位置恢复到上次播放的位置
            logDetailedDebug(
              '音频流需要更新，刚刚更新过了，现在替换掉当前播放的歌曲',
            )
            const { position } = await TrackPlayer.getProgress()
            const rntpTrack = convertToRNTPTrack(track)
            if (rntpTrack.isErr()) {
              logError('更新音频流失败', rntpTrack.error)
              return
            }
            await TrackPlayer.load(rntpTrack.value)
            await seekTo(position)
          }
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

      if (!checkPlayerReady()) return

      try {
        const currentQueue = shuffleMode ? shuffledQueue : queue

        if (currentQueue.length <= 1) {
          logDetailedDebug('队列中没有（或只有一首）曲目，无法跳转')
          await TrackPlayer.pause() // 停止播放
          set({ isPlaying: false })
          return
        }

        let nextIndex: number

        if (repeatMode === RepeatMode.Queue) {
          // 列表循环
          nextIndex = (currentIndex + 1) % currentQueue.length
        } else {
          // 顺序播放 & 关闭循环
          nextIndex = currentIndex + 1
          if (nextIndex >= currentQueue.length) {
            logDetailedDebug('已到达最后一首，停止播放')
            await TrackPlayer.pause() // 停止播放
            set({ isPlaying: false })
            return
          }
        }

        await get().skipToTrack(nextIndex) // 切换到下一首
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

      if (!checkPlayerReady()) return

      try {
        const currentQueue = shuffleMode ? shuffledQueue : queue

        if (currentQueue.length <= 1) {
          logDetailedDebug('队列中没有（或只有一首）曲目，无法跳转')
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

        await get().skipToTrack(previousIndex) // 切换到上一首
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

      if (!checkPlayerReady()) return

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

      if (!checkPlayerReady()) return

      let newMode: RepeatMode
      // 在设置播放器的重复模式时，列表循环、关闭循环模式都设置为 Off，方便靠我们自己的逻辑管理
      if (repeatMode === RepeatMode.Off) {
        newMode = RepeatMode.Track
        await TrackPlayer.setRepeatMode(newMode)
      } else if (repeatMode === RepeatMode.Track) {
        newMode = RepeatMode.Queue
        await TrackPlayer.setRepeatMode(RepeatMode.Off)
      } else {
        newMode = RepeatMode.Off
        await TrackPlayer.setRepeatMode(RepeatMode.Off)
      }
      set({ repeatMode: newMode })
      logDetailedDebug('状态已更新：重复模式已更改', { newMode })
    },

    // 切换随机模式
    toggleShuffleMode: () => {
      const { shuffleMode, queue, currentIndex } = get()
      logDetailedDebug('调用 toggleShuffleMode()', {
        currentMode: shuffleMode,
      })

      if (!checkPlayerReady()) return

      if (shuffleMode) {
        // 关闭随机模式，恢复原始队列
        logDetailedDebug('关闭随机模式，恢复原始队列')
        set(
          produce((state: PlayerState) => {
            state.shuffleMode = false
            // 找到当前播放曲目在原始队列中的索引
            if (state.currentTrack) {
              const currentTrack = state.currentTrack
              state.currentIndex = state.queue.findIndex((track) =>
                isTargetTrack(track, currentTrack.id, currentTrack.cid),
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
        const currentTrackIndex = shuffledQueue.findIndex((track) =>
          isTargetTrack(track, queue[currentIndex].id, queue[currentIndex].cid),
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

      if (!checkPlayerReady()) return

      try {
        logDetailedDebug('重置播放器')
        await TrackPlayer.reset()

        set(
          produce((store) => {
            store.queue = []
            store.currentIndex = -1
            store.currentTrack = null
            store.isPlaying = false
            store.shuffledQueue = []
            store.isBuffering = false
          }),
        )
        logDetailedDebug('状态已更新：队列已清空，播放器已重置')
      } catch (error) {
        logError('清空队列失败', error)
      }
    },

    // 检查并更新音频流和元数据，并将最终结果更新到 queue 中
    patchMetadataAndAudio: async (
      track: Track,
    ): Promise<
      Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | unknown>
    > => {
      logDetailedDebug('调用 patchMetadataAndAudio()', {
        trackId: track.id,
        title: track.title,
        source: track.source,
      })
      let updatedTrack = track
      try {
        if (!track.hasMetadata) {
          logDetailedDebug('这个 track 没有元数据，先获取元数据', {
            trackId: track.id,
            cid: track.cid,
          })
          const bilibiliApi = useAppStore.getState().bilibiliApi
          const metadata = await bilibiliApi.getVideoDetails(track.id)
          if (metadata.isErr()) {
            logError('获取元数据失败,返回原始track', metadata.error)
            return err(metadata.error)
          }
          updatedTrack = {
            ...track,
            title: metadata.value.title,
            artist: metadata.value.owner.name,
            cover: metadata.value.pic,
            duration: metadata.value.duration,
            createTime: metadata.value.pubdate,
            cid: metadata.value.cid,
            hasMetadata: true,
          }

          // 在这里立即更新当前曲目的信息，避免显示空白。
          set(
            produce((state: PlayerState) => {
              const queueIndex = state.queue.findIndex((t) =>
                isTargetTrack(t, updatedTrack.id, updatedTrack.cid),
              )
              if (queueIndex !== -1) {
                state.queue[queueIndex] = updatedTrack
              }
              const shuffledQueueIndex = state.shuffledQueue.findIndex((t) =>
                isTargetTrack(t, updatedTrack.id, updatedTrack.cid),
              )
              if (shuffledQueueIndex !== -1) {
                state.shuffledQueue[shuffledQueueIndex] = updatedTrack
              }
            }),
          )
          logDetailedDebug('B站音频元数据获取成功，开始继续检查音频流', {
            trackId: updatedTrack.id,
            title: updatedTrack.title,
            artist: updatedTrack.artist,
            cover: updatedTrack.cover,
            duration: updatedTrack.duration,
            createTime: updatedTrack.createTime,
          })
        }
        const result = await checkAndUpdateAudioStream(updatedTrack)
        if (result.isErr()) {
          return err(result.error)
        }
        const { track: finalTrack, needsUpdate } = result.value
        if (needsUpdate) {
          logDetailedDebug('音频流需要更新，更新到 queue 中', {
            trackId: finalTrack.id,
            title: finalTrack.title,
          })
          set(
            produce((state: PlayerState) => {
              const queueIndex = state.queue.findIndex((t) =>
                isTargetTrack(t, finalTrack.id, finalTrack.cid),
              )
              if (queueIndex !== -1) {
                state.queue[queueIndex] = finalTrack
              }
              const shuffledQueueIndex = state.shuffledQueue.findIndex((t) =>
                isTargetTrack(t, finalTrack.id, finalTrack.cid),
              )
              if (shuffledQueueIndex !== -1) {
                state.shuffledQueue[shuffledQueueIndex] = finalTrack
              }
            }),
          )
        }
        return ok({ track: finalTrack, needsUpdate: true })
      } catch (error) {
        return err(error)
      }
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

      if (!checkPlayerReady()) return

      if (index < 0 || index >= currentQueue.length) {
        logDetailedDebug('索引超出范围', { index })
        return
      }

      const track = currentQueue[index]
      if (!track) {
        logDetailedDebug('未找到指定索引的曲目', { index })
        return
      }
      // 乐观更新当前曲目，让界面显示更迅速
      if (track.hasMetadata) {
        set({ currentTrack: track, isBuffering: true, currentIndex: index })
      }

      // 检查并更新音频流
      const updatedTrack = await get().patchMetadataAndAudio(track)
      if (updatedTrack.isErr()) {
        logError('更新音频流失败', updatedTrack.error)
        return
      }

      // 使用 TrackPlayer.load() 替换当前曲目
      const rntpTrack = convertToRNTPTrack(updatedTrack.value.track)
      if (rntpTrack.isErr()) {
        logError('更新音频流失败', rntpTrack.error)
        return
      }
      await TrackPlayer.load(rntpTrack.value)

      // 更新状态 (在 load 之后，确保状态是最新的）
      set(
        produce((state: PlayerState) => {
          state.currentIndex = index
          state.currentTrack = updatedTrack.value.track
        }),
      )

      // 预加载
      get().preloadTracks(index)

      logDetailedDebug('已跳转到指定曲目', {
        index,
        trackTitle: updatedTrack.value.track.title,
      })
    },
  }

  return store
})

// 导出一些有用的hooks
export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
