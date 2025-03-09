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

// 音频流过期时间（毫秒）
const STREAM_EXPIRY_TIME = 120 * 60 * 1000 // 120分钟

// 将我们的Track类型转换为react-native-track-player的Track类型
const convertToRNTPTrack = (track: Track): RNTPTrack => {
  // 根据音频来源选择URL
  let url = ''
  if (track.source === 'bilibili' && track.biliStreamUrl) {
    url = track.biliStreamUrl.url
  } else if (track.source === 'local' && track.localStreamUrl) {
    url = track.localStreamUrl
  }

  return {
    id: track.id,
    url,
    title: track.title,
    artist: track.artist,
    artwork: track.cover,
    duration: track.duration,
  }
}

interface PlayerState {
  // 队列相关
  queue: Track[]
  currentIndex: number
  currentTrack: Track | null

  // 播放状态
  isPlaying: boolean
  isBuffering: boolean
  // track: 单曲循环，queue: 队列循环，off: 关闭循环
  repeatMode: 'off' | 'track' | 'queue'
  shuffleMode: boolean

  // 操作方法
  initPlayer: () => Promise<void>
  addToQueue: (tracks: Track[]) => Promise<void>
  playTrack: (track: Track, startQueue?: Track[]) => Promise<void>
  togglePlay: () => Promise<void>
  skipToNext: () => Promise<void>
  skipToPrevious: () => Promise<void>
  seekTo: (position: number) => Promise<void>
  toggleRepeatMode: () => void
  toggleShuffleMode: () => void
  clearQueue: () => Promise<void>

  // 音频流相关
  checkAndUpdateAudioStream: (track: Track) => Promise<Track>
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  repeatMode: 'off',
  shuffleMode: false,

  // 初始化播放器
  initPlayer: async () => {
    try {
      await TrackPlayer.setupPlayer({
        // 播放器配置
        minBuffer: 15, // 最小缓冲区（秒）
        maxBuffer: 50, // 最大缓冲区（秒）
        backBuffer: 30, // 回放缓冲区（秒）
        waitForBuffer: true, // 等待缓冲完成后再播放
      })

      // 设置播放器能力
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
        progressUpdateEventInterval: 1, // 进度更新间隔（秒）
      })

      // 监听播放状态变化
      TrackPlayer.addEventListener(
        Event.PlaybackState,
        async (data: { state: TrackPlayerState }) => {
          const { state } = data

          if (state === TrackPlayerState.Playing) {
            set({ isPlaying: true, isBuffering: false })
          } else if (
            state === TrackPlayerState.Paused ||
            state === TrackPlayerState.Stopped
          ) {
            set({ isPlaying: false, isBuffering: false })
          } else if (
            state === TrackPlayerState.Buffering ||
            state === TrackPlayerState.Loading
          ) {
            set({ isBuffering: true })
          }
        },
      )

      // 监听播放完成
      TrackPlayer.addEventListener(
        Event.PlaybackQueueEnded,
        async (data: { position: number; track: number }) => {
          const { position, track } = data
          const { repeatMode, queue, currentIndex } = get()

          if (repeatMode === 'track') {
            // 单曲循环
            await TrackPlayer.seekTo(0)
            await TrackPlayer.play()
          } else if (
            repeatMode === 'queue' &&
            currentIndex === queue.length - 1
          ) {
            // 队列循环且是最后一首
            const firstTrack = queue[0]
            if (firstTrack) {
              await get().playTrack(firstTrack)
            }
          }
        },
      )

      // 监听播放轨道变化
      // TrackPlayer.addEventListener(
      //   Event.PlaybackActiveTrackChanged,
      //   async (data: { index?: number | null | undefined }) => {
      //     const { index } = data
      //     if (index !== null && index !== undefined) {
      //       const trackIndex = await TrackPlayer.getActiveTrackIndex()
      //       if (trackIndex !== null && trackIndex !== undefined) {
      //         const track = get().queue[trackIndex]
      //         if (track) {
      //           set({ currentIndex: trackIndex, currentTrack: track })
      //         }
      //       }
      //     }
      //   },
      // )

      console.log('播放器初始化完成')
    } catch (error: unknown) {
      console.error('初始化播放器失败:', error)
    }
  },

  // 添加到队列
  addToQueue: async (tracks: Track[]) => {
    try {
      const { queue } = get()
      const newQueue = [...queue, ...tracks]

      // 检查并更新音频流
      const tracksWithStream = await Promise.all(
        tracks.map((track) => get().checkAndUpdateAudioStream(track)),
      )

      // 转换为RNTPTrack并添加到播放队列
      const rnTracks = tracksWithStream.map(convertToRNTPTrack)
      await TrackPlayer.add(rnTracks)

      set({ queue: newQueue })

      // 如果当前没有播放中的曲目，自动播放第一首
      if (queue.length === 0 && tracks.length > 0) {
        await get().playTrack(tracks[0], newQueue)
      }
    } catch (error) {
      console.error('添加到队列失败:', error)
    }
  },

  // 播放指定曲目
  playTrack: async (track: Track, startQueue?: Track[]) => {
    try {
      const queue = startQueue || get().queue

      // 查找曲目在队列中的索引
      const trackIndex = queue.findIndex((t) => t.id === track.id)

      // 如果曲目不在队列中，则添加到队列
      if (trackIndex === -1) {
        const updatedTrack = await get().checkAndUpdateAudioStream(track)
        await TrackPlayer.reset()
        await TrackPlayer.add(convertToRNTPTrack(updatedTrack))
        set({
          queue: [updatedTrack],
          currentIndex: 0,
          currentTrack: updatedTrack,
        })
      } else {
        // 检查并更新音频流
        const updatedTrack = await get().checkAndUpdateAudioStream(track)
        queue[trackIndex] = updatedTrack

        // 跳转到指定曲目
        await TrackPlayer.skip(trackIndex)
        set({ currentIndex: trackIndex, currentTrack: updatedTrack, queue })
      }

      // 开始播放
      await TrackPlayer.play()
      set({ isPlaying: true })
    } catch (error) {
      console.error('播放曲目失败:', error)
    }
  },

  // 切换播放/暂停
  togglePlay: async () => {
    try {
      const { isPlaying } = get()

      if (isPlaying) {
        await TrackPlayer.pause()
      } else {
        await TrackPlayer.play()
      }

      set({ isPlaying: !isPlaying })
    } catch (error) {
      console.error('切换播放状态失败:', error)
    }
  },

  // 下一曲
  skipToNext: async () => {
    try {
      const { queue, currentIndex, shuffleMode } = get()

      if (queue.length <= 1) return

      if (shuffleMode) {
        // 随机模式下随机选择一首（不重复当前曲目）
        let randomIndex: number
        do {
          randomIndex = Math.floor(Math.random() * queue.length)
        } while (randomIndex === currentIndex && queue.length > 1)

        const nextTrack = queue[randomIndex]
        await get().playTrack(nextTrack)
      } else {
        // 顺序模式
        await TrackPlayer.skipToNext()
      }
    } catch (error) {
      console.error('跳转到下一曲失败:', error)
    }
  },

  // 上一曲
  skipToPrevious: async () => {
    try {
      const { queue, currentIndex, shuffleMode } = get()

      if (queue.length <= 1) return

      if (shuffleMode) {
        // 随机模式下随机选择一首（不重复当前曲目）
        let randomIndex: number
        do {
          randomIndex = Math.floor(Math.random() * queue.length)
        } while (randomIndex === currentIndex && queue.length > 1)

        const prevTrack = queue[randomIndex]
        await get().playTrack(prevTrack)
      } else {
        // 顺序模式
        await TrackPlayer.skipToPrevious()
      }
    } catch (error) {
      console.error('跳转到上一曲失败:', error)
    }
  },

  // 跳转到指定位置
  seekTo: async (position: number) => {
    try {
      await TrackPlayer.seekTo(position)
    } catch (error) {
      console.error('跳转到指定位置失败:', error)
    }
  },

  // 切换重复模式
  toggleRepeatMode: () => {
    const { repeatMode } = get()

    let newMode: 'off' | 'track' | 'queue'
    if (repeatMode === 'off') {
      newMode = 'track'
    } else if (repeatMode === 'track') {
      newMode = 'queue'
    } else {
      newMode = 'off'
    }

    set({ repeatMode: newMode })
  },

  // 切换随机模式
  toggleShuffleMode: () => {
    const { shuffleMode } = get()
    set({ shuffleMode: !shuffleMode })
  },

  // 清空队列
  clearQueue: async () => {
    try {
      await TrackPlayer.reset()
      set({ queue: [], currentIndex: -1, currentTrack: null, isPlaying: false })
    } catch (error) {
      console.error('清空队列失败:', error)
    }
  },

  // 检查并更新音频流
  checkAndUpdateAudioStream: async (track: Track): Promise<Track> => {
    // 如果是本地音频，直接返回
    if (track.source === 'local') {
      return track
    }

    // 如果是B站音频，检查是否需要更新流
    if (track.source === 'bilibili') {
      const now = Date.now()

      console.log('track', track)

      // 检查是否有音频流或音频流是否过期
      const needsUpdate =
        !track.biliStreamUrl ||
        now - track.biliStreamUrl.getTime > STREAM_EXPIRY_TIME

      if (needsUpdate) {
        try {
          const bvid = track.id
          const pageList = await bilibiliApi.getPageList(bvid)
          // FIXME: 要如何处理多 p 视频？
          if (pageList.length !== 1) {
            console.error(
              '分P列表长度不为1，可能是多 p 视频，只添加第一个到队列',
            )
          }
          const cid = pageList[0].cid

          // 获取新的音频流
          const streamUrl = await bilibiliApi.getAudioStream({
            bvid,
            cid,
            audioQuality: 30280, // 默认音质，可以根据需要调整
            enableDolby: false,
            enableHiRes: false,
          })

          if (!streamUrl || !streamUrl.url) {
            console.error('获取音频流失败: 没有有效的URL')
            return track
          }

          // 更新track对象
          const updatedTrack: Track = {
            ...track,
            biliStreamUrl: {
              url: streamUrl.url,
              quality: streamUrl.quality || 0,
              getTime: Date.now() + 60, // 更新获取时间
              type: streamUrl.type || 'dash',
            },
          }

          // 如果是当前播放的曲目，需要更新播放器
          const { currentTrack } = get()
          if (currentTrack && currentTrack.id === track.id) {
            // 更新当前播放的曲目
            await TrackPlayer.updateNowPlayingMetadata({
              ...convertToRNTPTrack(updatedTrack),
            })
          }

          return updatedTrack
        } catch (error: unknown) {
          console.error('更新音频流失败:', error)
          return track // 失败时返回原始track
        }
      }
    }

    return track
  },
}))

// 导出一些有用的hooks
export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
