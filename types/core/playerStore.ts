import type { BilibiliApiError } from '@/utils/errors'
import type { Result } from 'neverthrow'
import type {
	RepeatMode,
	Track as RNTPTracker,
} from 'react-native-track-player'
import type { Track } from './media'

// 播放器状态接口
interface PlayerState {
	// 队列相关
	tracks: Record<string, Track> // 歌曲数据源，key 是 getTrackKey 的返回值
	orderedList: string[] // 顺序播放列表，存储 key
	shuffledList: string[] // 随机播放列表，存储 key

	currentTrackKey: string | null // 当前播放歌曲的 key

	// 播放状态
	isPlaying: boolean
	isBuffering: boolean
	repeatMode: RepeatMode
	shuffleMode: boolean
}

interface addToQueueParams {
	tracks: Track[]
	playNow: boolean
	clearQueue: boolean
	startFromKey?: string
	playNext: boolean
}

// 播放器操作接口
interface PlayerActions {
	// 辅助函数
	_getActiveList: () => string[]
	_getCurrentTrack: () => Track | null
	_getCurrentIndex: () => number

	// 重置
	resetPlayer: () => Promise<void>

	// 队列操作
	addToQueue: ({
		tracks,
		playNow,
		clearQueue,
		startFromKey,
		playNext,
	}: addToQueueParams) => Promise<void>
	resetStore: () => Promise<void>
	skipToTrack: (index: number) => Promise<void>
	rntpQueue: () => Promise<RNTPTracker[]>
	removeTrack: (id: string, cid?: number) => Promise<void>

	// 播放控制
	togglePlay: () => Promise<void>
	skipToNext: () => Promise<void>
	skipToPrevious: () => Promise<void>
	seekTo: (position: number) => Promise<void>

	// 模式控制
	toggleRepeatMode: () => void
	toggleShuffleMode: () => void

	// 音频流处理
	patchMetadataAndAudio: (
		track: Track,
	) => Promise<
		Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | unknown>
	>
	preloadTracks: (index: number) => Promise<void>
}

// 完整的播放器存储类型
type PlayerStore = PlayerState & PlayerActions

export type { addToQueueParams, PlayerActions, PlayerState, PlayerStore }
