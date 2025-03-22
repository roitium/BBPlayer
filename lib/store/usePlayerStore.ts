import { create } from 'zustand'
import TrackPlayer, {
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player'
import type { Track } from '@/types/core/media'
import { middleware } from 'zustand-expo-devtools'
import { produce } from 'immer'
import type { PlayerStore, PlayerState } from '@/types/core/playerStore'
import { logDetailedDebug, logError } from '@/utils/log'
import { checkAndUpdateAudioStream, convertToRNTPTrack } from '@/utils/player'
import useAppStore from './useAppStore'

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
      const store = getStore() // 获取最新的 store 状态
      const { repeatMode } = store

      logDetailedDebug('播放队列结束（即单曲结束）', {
        repeatMode,
      })

      // 单曲结束后的行为
      if (repeatMode !== RepeatMode.Track) {
        // 如果不是单曲循环，则触发切换到下一首
        logDetailedDebug('当前队列：', store.queue)
        await store.skipToNext()
      }
    })

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
          const track = await getStore().patchMetadataAndAudio(nowTrack)
          logDetailedDebug('更新音频流成功', {
            trackId: track.id,
            title: track.title,
          })
          // 使用 load 方法替换当前曲目
          await TrackPlayer.load(convertToRNTPTrack(track))
        }
      },
    )

    logDetailedDebug('所有事件监听器设置完成')
  },
}

/**
 * 播放器状态存储
 * 采用 zustand 自己维护一个 queue，rntp 仅用于播放当前的 track，通过 TrackPlayer.load 来替换当前播放的内容，所有操作都通过该 store 进行
 */
export const usePlayerStore = create<PlayerStore>((set, get) => {
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
      PlayerLogic.setupEventListeners(() => get())
      logDetailedDebug('播放器初始化完成')
    },

    // rntpQueue (现在始终返回一个只有一个元素的数组)
    rntpQueue: async () => {
      logDetailedDebug('调用 rntpQueue()')
      const currentTrack = await TrackPlayer.getActiveTrack()
      return currentTrack ? [currentTrack] : []
    },

    // 添加到队列
    addToQueue: async (tracks: Track[], playNow = true) => {
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

          if (newTracks.length === 0) {
            logDetailedDebug('无新曲目需要添加')
            return
          }

          // playNow 模式下，将新曲目插入到当前播放曲目的后面，否则添加到队列末尾
          if (playNow) {
            logDetailedDebug('立即播放模式，插入到当前播放曲目之后')
            const insertIndex = state.currentIndex + 1
            state.queue.splice(insertIndex, 0, ...newTracks)

            // 更新当前索引和曲目
            state.currentIndex = insertIndex
            state.currentTrack = newTracks[0]
          } else {
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

      // 预加载当前播放歌曲的后三首
      const preloadStartIndex = index + 1
      const preloadEndIndex = Math.min(
        preloadStartIndex + 3,
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
      const { isPlaying, currentTrack } = get()
      logDetailedDebug('调用 togglePlay()', {
        isPlaying,
        currentTrack: currentTrack?.title,
        currentIndex: get().currentIndex,
      })
      try {
        if (!(await get().rntpQueue()).length) {
          logDetailedDebug('队列为空，如果当前有曲目，尝试重新加载')
          if (currentTrack) {
            get().skipToTrack(get().currentIndex)
          }
        }
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
          logDetailedDebug('队列中没有（或只有一首）曲目，无法跳转')
          return
        }

        let nextIndex: number

        if (repeatMode === RepeatMode.Queue) {
          // 列表循环
          nextIndex = (currentIndex + 1) % currentQueue.length
        } else if (shuffleMode) {
          // 随机模式
          do {
            nextIndex = Math.floor(Math.random() * currentQueue.length)
          } while (nextIndex === currentIndex && currentQueue.length > 1)
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
      await TrackPlayer.setRepeatMode(newMode) // 设置重复模式
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
          currentIndex: -1,
          currentTrack: null,
          isPlaying: false,
          shuffledQueue: [],
        })
        logDetailedDebug('状态已更新：队列已清空，播放器已重置')
      } catch (error) {
        logError('清空队列失败', error)
      }
    },

    // 检查并更新音频流和元数据，并将最终结果更新到 queue 中
    patchMetadataAndAudio: async (track: Track): Promise<Track> => {
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
          })
          const bilibiliApi = useAppStore.getState().bilibiliApi
          const metadata = await bilibiliApi.getVideoDetails(track.id)
          updatedTrack = {
            ...track,
            title: metadata.title,
            artist: metadata.owner.name,
            cover: metadata.pic,
            duration: metadata.duration,
            createTime: metadata.pubdate,
            cid: metadata.cid,
            hasMetadata: true,
          }
          // 在这里立即更新当前曲目的信息，避免显示空白。
          set(
            produce((state: PlayerState) => {
              const queueIndex = state.queue.findIndex(
                (t) => t.id === updatedTrack.id,
              )
              if (queueIndex !== -1) {
                state.queue[queueIndex] = updatedTrack
              }
              const shuffledQueueIndex = state.shuffledQueue.findIndex(
                (t) => t.id === updatedTrack.id,
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
        const { track: finalTrack, needsUpdate } =
          await checkAndUpdateAudioStream(updatedTrack)
        if (needsUpdate) {
          logDetailedDebug('音频流需要更新，更新到 queue 中', {
            trackId: finalTrack.id,
            title: finalTrack.title,
          })
          set(
            produce((state: PlayerState) => {
              const queueIndex = state.queue.findIndex(
                (t) => t.id === finalTrack.id,
              )
              if (queueIndex !== -1) {
                state.queue[queueIndex] = finalTrack
              }
              const shuffledQueueIndex = state.shuffledQueue.findIndex(
                (t) => t.id === finalTrack.id,
              )
              if (shuffledQueueIndex !== -1) {
                state.shuffledQueue[shuffledQueueIndex] = finalTrack
              }
            }),
          )
        }
        return finalTrack
      } catch (error) {
        logError('检查并更新音频流失败', error)
        return track
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
        set({ currentTrack: track, isBuffering: true })
      }

      // 检查并更新音频流
      const updatedTrack = await get().patchMetadataAndAudio(track)

      // 使用 TrackPlayer.load() 替换当前曲目
      await TrackPlayer.load(convertToRNTPTrack(updatedTrack))

      // 更新状态 (在 load 之后，确保状态是最新的)
      set(
        produce((state: PlayerState) => {
          state.currentIndex = index
          state.currentTrack = updatedTrack
        }),
      )

      // 预加载
      get().preloadTracks(index)

      logDetailedDebug('已跳转到指定曲目', {
        index,
        trackTitle: updatedTrack.title,
      })
    },
  }

  return store
})

middleware(usePlayerStore)

// 导出一些有用的hooks
export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
