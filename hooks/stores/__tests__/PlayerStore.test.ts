import TrackPlayer, { RepeatMode } from 'react-native-track-player'
import { PRELOAD_TRACKS } from '@/constants/player'
import { initPlayer } from '@/lib/player/playerLogic'
import type { Track } from '@/types/core/media'
import { usePlayerStore } from '../usePlayerStore'

jest.mock('react-native-track-player', () => {
	const mockConstants = {
		AppKilledPlaybackBehavior: { PausePlayback: 'PausePlayback' },
		Capability: {
			Play: 'play',
			Pause: 'pause',
			Stop: 'stop',
			SkipToNext: 'skip-to-next',
			SkipToPrevious: 'skip-to-previous',
			SeekTo: 'seek-to',
		},
		Event: {
			PlaybackState: 'playback-state',
			PlaybackQueueEnded: 'playback-queue-ended',
			PlaybackError: 'playback-error',
		},
		RepeatMode: { Off: 0, Track: 1, Queue: 2 },
		State: {
			None: 'none',
			Ready: 'ready',
			Playing: 'playing',
			Paused: 'paused',
			Stopped: 'stopped',
			Buffering: 'buffering',
			Loading: 'loading',
		},
	}

	const mockTrackPlayerFunctions = {
		setupPlayer: jest.fn().mockResolvedValue(undefined),
		updateOptions: jest.fn().mockResolvedValue(undefined),
		setRepeatMode: jest.fn().mockResolvedValue(undefined),
		getActiveTrack: jest.fn().mockResolvedValue(null),
		remove: jest.fn().mockResolvedValue(undefined),
		load: jest.fn().mockResolvedValue(undefined),
		play: jest.fn().mockResolvedValue(undefined),
		pause: jest.fn().mockResolvedValue(undefined),
		stop: jest.fn().mockResolvedValue(undefined),
		seekTo: jest.fn().mockResolvedValue(undefined),
		getProgress: jest
			.fn()
			.mockResolvedValue({ position: 60, duration: 180, buffered: 180 }),
		reset: jest.fn().mockResolvedValue(undefined),
		addEventListener: jest.fn(() => ({ remove: jest.fn() })),
	}

	const mockHooksAndEvents = {
		addEventListener: jest.fn(() => ({ remove: jest.fn() })),
		usePlaybackState: jest.fn(() => ({ state: mockConstants.State.None })),
		useProgress: jest.fn(() => ({
			position: 60,
			duration: 180,
			buffered: 180,
		})),
	}

	return {
		__esModule: true,

		default: mockTrackPlayerFunctions,

		...mockConstants,
		...mockHooksAndEvents,
	}
})

// Mock utils/player
jest.mock('@/utils/player', () => ({
	...jest.requireActual('@/utils/player'),
	checkAndUpdateAudioStream: jest.fn(),
	convertToRNTPTrack: jest.fn().mockReturnValue({
		isErr: () => false,
		value: {},
	}),
}))

// jest.mock('@/utils/log', () => {
// 	const mockLog = {
// 		debug: jest.fn(),
// 		info: jest.fn(),
// 		warn: jest.fn(),
// 		error: jest.fn(),
// 		sentry: jest.fn(),
// 	}
// 	return {
// 		...mockLog,
// 		extend: () => mockLog,
// 	}
// })

jest.mock('@/utils/log', () => {
	const mockLog = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		sentry: jest.fn(),
	}
	return {
		...mockLog,
		extend: () => mockLog,
	}
})

jest.mock('@/utils/toast', () => ({
	error: jest.fn(),
	success: jest.fn(),
	info: jest.fn(),
}))

jest.mock('../useAppStore.ts', () => ({
	__esModule: true,
	default: {
		getState: jest.fn(() => ({
			bilibiliApi: {
				getVideoDetails: jest.fn(),
			},
		})),
	},
}))

jest.mock('../../../assets/images/icon.png', () => 0)
jest.mock('@/constants/player', () => ({
	...jest.requireActual('@/constants/player'),
	PRELOAD_TRACKS: 2,
}))

const createMockTrack = (
	id: string,
	cid?: number,
	overrides: Partial<Track> = {},
): Track => {
	//  @ts-expect-error 111
	const base: Track = {
		id: id,
		title: `Title ${id}${cid ? `-${cid}` : ''}`,
		artist: `Artist ${id}`,
		cover: `cover_${id}.jpg`,
		source: 'bilibili',
		duration: 180 + Number.parseInt(id, 10),
		hasMetadata: true,
		isMultiPage: cid !== undefined,
		...(cid !== undefined ? { cid: cid } : {}),
		biliStreamUrl: {
			url: `http://stream.com/${id}/${cid || ''}?valid`,
			quality: 80,
			getTime: Date.now(),
			type: 'dash',
		},
		...overrides,
	}
	if (base.isMultiPage) {
		return base as Track & { isMultiPage: true; cid: number }
	}
	return base as Track & { isMultiPage: false; cid?: number }
}

const track1 = createMockTrack('1')
const track2 = createMockTrack('2')
const track3 = createMockTrack('3')
const track4MultiPage = createMockTrack('4', 12345)
const track5NeedsMeta = createMockTrack('5', undefined, {
	hasMetadata: false,
	title: undefined,
	artist: undefined,
	duration: undefined,
	cover: undefined,
})
const track6Expired = createMockTrack('6', undefined, {
	biliStreamUrl: {
		url: 'http://example.com/6?expired',
		quality: 80,
		getTime: Date.now() - 130 * 60 * 1000,
		type: 'dash',
	},
})

const initialState = usePlayerStore.getState()
const mockSkipToTrack = jest.fn().mockResolvedValue(undefined)

afterEach(() => {
	usePlayerStore.setState(initialState, true)
})

beforeEach(() => {
	global.playerIsReady = true
	jest.clearAllMocks()
	usePlayerStore.setState({
		skipToTrack: mockSkipToTrack,
	})
})

describe('usePlayerStore 测试', () => {
	describe('addToQueue', () => {
		it('添加到队列末尾 playNow=false & clearQueue=false & playNext=false 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加一些曲目到队列
			await addToQueue({
				tracks: [track1],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			// 再添加新的曲目
			await addToQueue({
				tracks: [track2, track3],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3)
			expect(state.queue[0]).toMatchObject(track1)
			expect(state.queue[1]).toMatchObject(track2)
			expect(state.queue[2]).toMatchObject(track3)
			expect(state.currentIndex).toBe(0) // 队列之前为空，第一首设为当前曲目
			expect(state.currentTrack).toMatchObject(track1)
		})

		it('清空队列并添加到队列末尾 clearQueue=true 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加一些曲目到队列
			await addToQueue({
				tracks: [track1, track2],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			// 清空队列并添加新的曲目
			await addToQueue({
				tracks: [track3],
				playNow: false,
				clearQueue: true,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(1)
			expect(state.queue[0]).toMatchObject(track3)
			expect(state.currentIndex).toBe(0) // 队列之前为空，第一首设为当前曲目
			expect(state.currentTrack).toMatchObject(track3)
		})

		it('清空队列并立即播放新增队列的第一首 playNow=true & clearQueue=true测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加一些曲目到队列
			await addToQueue({
				tracks: [track1, track2],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			// 清空队列并添加新的曲目并立即播放
			await addToQueue({
				tracks: [track3],
				playNow: true,
				clearQueue: true,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(1)
			expect(state.queue[0]).toMatchObject(track3)
			expect(state.currentIndex).toBe(0)
			expect(state.currentTrack).toMatchObject(track3)
			expect(state.isPlaying).toBe(true)
		})

		it('添加到当前播放曲目之后并立即播放新增队列的第一首 playNow=true & clearQueue=false 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加并播放 track1
			await addToQueue({
				tracks: [track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			// 添加 track2, track3 到当前播放曲目之后并立即播放 track2
			await addToQueue({
				tracks: [track2, track3],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3)
			expect(state.queue[0]).toMatchObject(track1)
			expect(state.queue[1]).toMatchObject(track2)
			expect(state.queue[2]).toMatchObject(track3)
			expect(state.currentIndex).toBe(1)
			expect(state.currentTrack).toMatchObject(track2)
			expect(state.isPlaying).toBe(true)
		})

		it('添加到当前播放曲目之后并立即播放指定 startFromId 的曲目 playNow=true & startFromId 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加并播放 track1
			await addToQueue({
				tracks: [track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			await addToQueue({
				tracks: [track2, track3],
				playNow: true,
				clearQueue: false,
				playNext: false,
				startFromId: '3',
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3)
			expect(state.currentIndex).toBe(2)
			expect(state.currentTrack).toMatchObject(track3)
			expect(state.isPlaying).toBe(true)
		})

		it('添加到当前播放曲目之后并立即播放指定 startFromCid 的曲目 playNow=true & startFromCid 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加并播放 track1
			await addToQueue({
				tracks: [track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			await addToQueue({
				tracks: [track2, track3, track4MultiPage],
				playNow: true,
				clearQueue: false,
				playNext: false,
				startFromCid: 12345,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(4)
			expect(state.currentIndex).toBe(3)
			expect(state.currentTrack).toMatchObject(track4MultiPage)
			expect(state.isPlaying).toBe(true)
		})

		it('添加到当前播放曲目之后 playNow=false & playNext=true 测试', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加并播放 track1
			await addToQueue({
				tracks: [track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			// 添加 track2, track3 到当前播放曲目之后
			await addToQueue({
				tracks: [track2, track3],
				playNow: false,
				clearQueue: false,
				playNext: true,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3)
			expect(state.queue).toMatchObject([track1, track2, track3])
			expect(state.currentIndex).toBe(0)
			expect(state.currentTrack).toMatchObject(track1)
			expect(state.isPlaying).toBe(true)
		})

		it('添加已存在于队列中的曲目应被过滤', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加 track1, track2
			await addToQueue({
				tracks: [track1, track2],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			// 尝试再次添加 track1
			await addToQueue({
				tracks: [track1, track3],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3) // track1 被过滤，只添加了 track3
			expect(state.queue[0]).toMatchObject(track1)
			expect(state.queue[1]).toMatchObject(track2)
			expect(state.queue[2]).toMatchObject(track3)
		})

		it('当 startFromCid 无法匹配到项目时应默认为 playNow=true 行为', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			await addToQueue({
				tracks: [track3],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			await addToQueue({
				tracks: [track1, track2],
				playNow: true,
				clearQueue: false,
				playNext: false,
				startFromCid: 1000,
			})
			expect(usePlayerStore.getState().currentIndex).toBe(1)
			expect(usePlayerStore.getState().currentTrack).toMatchObject(track1)
		})

		it('当 startFromId 无法匹配到项目时应默认为 playNow=true 行为', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			await addToQueue({
				tracks: [track3],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			await addToQueue({
				tracks: [track1, track2],
				playNow: true,
				clearQueue: false,
				playNext: false,
				startFromId: '5',
			})
			expect(usePlayerStore.getState().currentIndex).toBe(1)
			expect(usePlayerStore.getState().currentTrack).toMatchObject(track1)
		})

		it('添加空数组曲目应无效果', async () => {
			await initPlayer()
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加 track1
			await addToQueue({
				tracks: [track1],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			// 尝试添加空数组
			await addToQueue({
				tracks: [],
				playNow: false,
				clearQueue: false,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(1)
			expect(state.queue[0]).toMatchObject(track1)
		})

		it('当新曲目被完全过滤后应播放新队列的第一首（未提供 startFromX 时）', async () => {
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加一些曲目到队列
			await addToQueue({
				tracks: [track1, track2],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			// 再次添加
			await addToQueue({
				tracks: [track2, track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(2)
			expect(state.currentIndex).toBe(1) // 队列顺序不改变，但是会播放新队列的第一首（即 track2）
			expect(state.currentTrack).toMatchObject(track2)
			expect(state.isPlaying).toBe(true)
		})

		it('当新曲目被完全过滤后应按照提供的 startFromX 播放（提供 startFromCid 时）', async () => {
			const addToQueue = usePlayerStore.getState().addToQueue
			// 先添加一些曲目到队列
			await addToQueue({
				tracks: [track1, track2, track3],
				playNow: true,
				clearQueue: false,
				playNext: false,
			})
			// 再次添加
			await addToQueue({
				tracks: [track2, track3, track1],
				playNow: true,
				clearQueue: false,
				playNext: false,
				startFromId: '3',
			})
			const state = usePlayerStore.getState()
			expect(state.queue.length).toBe(3)
			expect(state.currentIndex).toBe(2)
			expect(state.currentTrack).toMatchObject(track3)
			expect(state.isPlaying).toBe(true)
		})
	})

	describe('preloadTracks', () => {
		beforeEach(() => {
			const mockPatchMetadataAndAudio = jest.fn().mockResolvedValue({
				isErr: () => false,
				value: { needsUpdate: false, track: {} },
			})
			usePlayerStore.setState({
				patchMetadataAndAudio: mockPatchMetadataAndAudio,
			})
		})

		it('应该预加载当前曲目之后的曲目 (非随机模式)', async () => {
			const { getState } = usePlayerStore
			const { preloadTracks, patchMetadataAndAudio } = getState()

			// 设置队列和当前索引
			const queue = [track1, track2, track3, track4MultiPage, track5NeedsMeta]
			usePlayerStore.setState({ queue, currentIndex: 0, shuffleMode: false })

			// 调用 preloadTracks
			await preloadTracks(0)

			// 验证 patchMetadataAndAudio 是否被调用了 PRELOAD_TRACKS 次，并且参数正确
			expect(patchMetadataAndAudio).toHaveBeenCalledTimes(PRELOAD_TRACKS)
			expect(patchMetadataAndAudio).toHaveBeenCalledWith(track2)
			expect(patchMetadataAndAudio).toHaveBeenCalledWith(track3)
		})

		it('应该预加载当前曲目之后的曲目 (随机模式)', async () => {
			const { getState } = usePlayerStore
			const { preloadTracks, patchMetadataAndAudio } = getState()

			// 设置队列、随机队列和当前索引
			const queue = [track1, track2, track3, track4MultiPage, track5NeedsMeta]
			const shuffledQueue = [
				track5NeedsMeta,
				track3,
				track1,
				track4MultiPage,
				track2,
			]
			usePlayerStore.setState({
				queue,
				shuffledQueue,
				currentIndex: 2, // track1 在随机队列中的索引
				shuffleMode: true,
			})

			// 调用 preloadTracks
			await preloadTracks(2)

			// 验证 patchMetadataAndAudio 是否被调用了 PRELOAD_TRACKS 次，并且参数正确
			expect(patchMetadataAndAudio).toHaveBeenCalledTimes(PRELOAD_TRACKS)
			expect(patchMetadataAndAudio).toHaveBeenCalledWith(track4MultiPage)
			expect(patchMetadataAndAudio).toHaveBeenCalledWith(track2)
		})

		it('当剩余曲目少于 PRELOAD_TRACKS 时，应该只预加载剩余曲目', async () => {
			const { getState } = usePlayerStore
			const { preloadTracks, patchMetadataAndAudio } = getState()

			// 设置队列和当前索引，剩余曲目少于 PRELOAD_TRACKS
			const queue = [track1, track2, track3]
			usePlayerStore.setState({ queue, currentIndex: 1, shuffleMode: false }) // 剩余 track3

			// 调用 preloadTracks
			await preloadTracks(1)

			// 验证 patchMetadataAndAudio 是否只被调用了 1 次 (track3)
			expect(patchMetadataAndAudio).toHaveBeenCalledTimes(1)
			expect(patchMetadataAndAudio).toHaveBeenCalledWith(track3)
		})

		it('当当前曲目是最后一首时，不应该预加载任何曲目', async () => {
			const { getState } = usePlayerStore
			const { preloadTracks, patchMetadataAndAudio } = getState()

			// 设置队列和当前索引为最后一首
			const queue = [track1, track2]
			usePlayerStore.setState({ queue, currentIndex: 1, shuffleMode: false })

			// 调用 preloadTracks
			await preloadTracks(1)

			// 验证 patchMetadataAndAudio 没有被调用
			expect(patchMetadataAndAudio).not.toHaveBeenCalled()
		})
	})

	describe('togglePlay', () => {
		it('当音频源需要更新时，先更新再播放，且能跳转到原先位置', async () => {
			const { togglePlay } = usePlayerStore.getState()
			const mockPatchMetadataAndAudio = jest.fn().mockResolvedValue({
				isErr: () => false,
				value: { needsUpdate: true, track: {} },
			})
			const mockSeekTo = jest.fn().mockResolvedValue(undefined)
			usePlayerStore.setState({
				patchMetadataAndAudio: mockPatchMetadataAndAudio,
				isPlaying: false,
				currentTrack: track6Expired,
				currentIndex: 0,
				seekTo: mockSeekTo,
				queue: [track6Expired],
				rntpQueue: jest.fn().mockResolvedValue([track6Expired]),
			})
			await togglePlay()
			expect(mockPatchMetadataAndAudio).toHaveBeenCalledTimes(1)
			expect(mockPatchMetadataAndAudio).toHaveBeenCalledWith(track6Expired)
			expect(mockSeekTo).toHaveBeenCalledWith(60)
		})
	})

	// 同样只测试顺序模式
	describe('skipToNext', () => {
		const queue = [track1, track2, track3]

		it('应跳转到下一首', async () => {
			usePlayerStore.setState({
				queue,
				currentIndex: 0,
				shuffleMode: false,
				repeatMode: RepeatMode.Off,
			})
			await usePlayerStore.getState().skipToNext()
			expect(mockSkipToTrack).toHaveBeenCalledWith(1)
		})

		it('最后一首 & RepeatMode.Off：应暂停播放', async () => {
			usePlayerStore.setState({
				queue,
				currentIndex: 2, // 最后一首
				shuffleMode: false,
				repeatMode: RepeatMode.Off,
				isPlaying: true,
			})
			await usePlayerStore.getState().skipToNext()
			expect(mockSkipToTrack).not.toHaveBeenCalled()
			expect(TrackPlayer.pause).toHaveBeenCalled()
			expect(usePlayerStore.getState().isPlaying).toBe(false)
		})

		it('最后一首 & RepeatMode.Queue：应跳转到第一首', async () => {
			usePlayerStore.setState({
				queue,
				currentIndex: 2, // 最后一首
				shuffleMode: false,
				repeatMode: RepeatMode.Queue,
			})
			await usePlayerStore.getState().skipToNext()
			expect(mockSkipToTrack).toHaveBeenCalledWith(0)
		})

		it('队列为空或只有一首歌：应暂停播放', async () => {
			usePlayerStore.setState({
				queue: [track1],
				currentIndex: 0,
				shuffleMode: false,
				repeatMode: RepeatMode.Off,
				isPlaying: true,
			})
			await usePlayerStore.getState().skipToNext()
			expect(mockSkipToTrack).not.toHaveBeenCalled()
			expect(TrackPlayer.pause).toHaveBeenCalled()
			expect(usePlayerStore.getState().isPlaying).toBe(false)

			// 测试空队列
			jest.clearAllMocks()
			usePlayerStore.setState({
				queue: [],
				currentIndex: -1,
				shuffleMode: false,
				repeatMode: RepeatMode.Off,
				isPlaying: true,
			})
			await usePlayerStore.getState().skipToNext()
			expect(mockSkipToTrack).not.toHaveBeenCalled()
			expect(TrackPlayer.pause).toHaveBeenCalled()
			expect(usePlayerStore.getState().isPlaying).toBe(false)
		})
	})

	// 由于 随机/顺序 模式的区别只在于选择哪个 queue，所以这里只测试顺序
	describe('skipToPrevious', () => {
		const queue = [track1, track2, track3]

		it('应跳转到上一首', async () => {
			usePlayerStore.setState({
				queue,
				currentIndex: 1, // 当前是 track2
				shuffleMode: false,
			})
			await usePlayerStore.getState().skipToPrevious()
			expect(mockSkipToTrack).toHaveBeenCalledWith(0) // 跳转到 track1
		})

		it('当前是第一首时应跳转到最后一首', async () => {
			usePlayerStore.setState({
				queue,
				currentIndex: 0, // 当前是 track1
				shuffleMode: false,
			})
			await usePlayerStore.getState().skipToPrevious()
			expect(mockSkipToTrack).toHaveBeenCalledWith(2) // 跳转到 track3
		})

		it('队列为空或只有一首歌时不执行任何操作', async () => {
			usePlayerStore.setState({
				queue: [track1],
				currentIndex: 0,
				shuffleMode: false,
			})
			await usePlayerStore.getState().skipToPrevious()
			expect(mockSkipToTrack).not.toHaveBeenCalled()

			// 测试空队列
			jest.clearAllMocks()
			usePlayerStore.setState({
				queue: [],
				currentIndex: -1,
				shuffleMode: false,
			})
			await usePlayerStore.getState().skipToPrevious()
			expect(mockSkipToTrack).not.toHaveBeenCalled()
		})
	})
})
