import type { Result } from 'neverthrow'
import type {
	RepeatMode,
	Track as RNTPTracker,
} from 'react-native-track-player'
import type { BilibiliApiError } from '@/utils/errors'
import type { Track } from './media'

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

interface addToQueueParams {
	tracks: Track[]
	playNow: boolean
	clearQueue: boolean
	startFromId?: string
	startFromCid?: number
	playNext: boolean
}

// 播放器操作接口
interface PlayerActions {
	// 重置
	resetPlayer: () => Promise<void>

	// 队列操作
	addToQueue: ({
		tracks,
		playNow,
		clearQueue,
		startFromId,
		startFromCid,
		playNext,
	}: addToQueueParams) => Promise<void>
	clearQueue: () => Promise<void>
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

export type { PlayerState, PlayerActions, PlayerStore, addToQueueParams }
