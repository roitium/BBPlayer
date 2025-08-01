import type { BilibiliApiError } from '@/lib/core/errors/bilibili'
import type { Result } from 'neverthrow'
import type {
	RepeatMode,
	Track as RNTPTracker,
} from 'react-native-track-player'
import type { Track } from './media'

// 播放器状态接口
interface PlayerState {
	// 队列相关
	tracks: Record<string, Track> // 歌曲数据源，key 是 id
	orderedList: string[] // 顺序播放列表，存储 id
	shuffledList: string[] // 随机播放列表，存储 id

	currentTrackId: string | null // 当前播放歌曲的 id

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
	startFromId?: string
	playNext: boolean
}

// 播放器操作接口
interface PlayerActions {
	// 辅助函数
	_getActiveList: () => string[]
	_getCurrentTrack: () => Track | null
	_getCurrentIndex: () => number

	// 队列操作
	addToQueue: ({
		tracks,
		playNow,
		clearQueue,
		startFromId,
		playNext,
	}: addToQueueParams) => Promise<void>
	resetStore: () => Promise<void>
	skipToTrack: (index: number) => Promise<void>
	rntpQueue: () => Promise<RNTPTracker[]>
	removeTrack: (id: string) => Promise<void>

	// 播放控制
	togglePlay: () => Promise<void>
	skipToNext: () => Promise<void>
	skipToPrevious: () => Promise<void>
	seekTo: (position: number) => Promise<void>

	// 模式控制
	toggleRepeatMode: () => void
	toggleShuffleMode: () => void

	// 音频流处理
	patchAudio: (
		track: Track,
	) => Promise<
		Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | unknown>
	>
}

// 完整的播放器存储类型
type PlayerStore = PlayerState & PlayerActions

export type { addToQueueParams, PlayerActions, PlayerState, PlayerStore }
