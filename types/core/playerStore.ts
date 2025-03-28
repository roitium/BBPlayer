import type { RepeatMode } from 'react-native-track-player'
import type { Track } from './media'
import type { Track as RNTPTracker } from 'react-native-track-player'

// 播放器状态接口
interface PlayerState {
  // 队列相关
  queue: Track[]
  currentIndex: number
  currentTrack: Track | null

  // 播放状态
  isPlaying: boolean
  isBuffering: boolean
  repeatMode: RepeatMode
  shuffleMode: boolean
  shuffledQueue: Track[]
}

// 播放器操作接口
interface PlayerActions {
  // 初始化
  initPlayer: () => Promise<void>

  // 队列操作
  addToQueue: (
    tracks: Track[],
    playNow?: boolean,
    clearQueue?: boolean,
  ) => Promise<void>
  clearQueue: () => Promise<void>
  skipToTrack: (index: number) => Promise<void>
  rntpQueue: () => Promise<RNTPTracker[]>

  // 播放控制
  togglePlay: () => Promise<void>
  skipToNext: () => Promise<void>
  skipToPrevious: () => Promise<void>
  seekTo: (position: number) => Promise<void>

  // 模式控制
  toggleRepeatMode: () => void
  toggleShuffleMode: () => void

  // 音频流处理
  patchMetadataAndAudio: (track: Track) => Promise<Track>
  preloadTracks: (index: number) => Promise<void>
}

// 完整的播放器存储类型
type PlayerStore = PlayerState & PlayerActions

export type { PlayerState, PlayerActions, PlayerStore }
