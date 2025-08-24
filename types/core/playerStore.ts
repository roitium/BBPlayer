import type { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import type { Result } from 'neverthrow'
import type { RepeatMode } from 'react-native-track-player'
import type { RNTPTrack } from '../rntp'
import type { Track } from './media'

// 播放器状态接口
interface PlayerState {
	// 队列相关
	tracks: Record<string, Track> // 歌曲数据源，key 是 uniqueKey
	orderedList: string[] // 顺序播放列表，存储 uniqueKey
	shuffledList: string[] // 随机播放列表，存储 uniqueKey

	currentTrackUniqueKey: string | null // 当前播放歌曲的 uniqueKey

	// 播放状态
	isPlaying: boolean
	isBuffering: boolean
	repeatMode: RepeatMode
	shuffleMode: boolean

	// 播放统计
	currentPlayStartAt: number | null // 当前曲目开始播放的时间戳(ms)
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
	_finalizeAndRecordCurrentPlay: (
		reason?: 'skip' | 'ended' | 'stop',
	) => Promise<void>

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
	rntpQueue: () => Promise<RNTPTrack[]>
	removeTrack: (id: string) => Promise<void>
	reShuffleQueue: () => void

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
		Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | Error>
	>
}

// 完整的播放器存储类型
type PlayerStore = PlayerState & PlayerActions

export type { addToQueueParams, PlayerActions, PlayerState, PlayerStore }
