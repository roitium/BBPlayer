import TrackPlayer, {
	AppKilledPlaybackBehavior,
	Capability,
	Event,
	RepeatMode,
	State as TrackPlayerState,
} from 'react-native-track-player'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import log from '@/utils/log'
import { convertToRNTPTrack } from '@/utils/player'

const playerLog = log.extend('PLAYER/LOGIC')

const initPlayer = async () => {
	playerLog.debug('调用 initPlayer()')
	await PlayerLogic.preparePlayer()
	PlayerLogic.setupEventListeners()
	// 在初始化时修改一次重复模式，与水合后的 store 状态保持一致
	const repeatMode = usePlayerStore.getState().repeatMode
	await TrackPlayer.setRepeatMode(
		repeatMode === RepeatMode.Track ? RepeatMode.Track : RepeatMode.Off,
	)
	global.playerIsReady = true
	playerLog.debug('播放器初始化完成')
}

const PlayerLogic = {
	// 初始化播放器
	async preparePlayer(): Promise<void> {
		playerLog.debug('开始初始化播放器')
		try {
			playerLog.debug('设置播放器配置')
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
			playerLog.debug('播放器配置设置完成')

			// 设置播放器能力（怕自己忘了记一下：如果想修改这些能力对应的函数调用，要去 /lib/services/playbackService 里改）
			playerLog.debug('开始设置播放器能力')
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
				icon: require('../../assets/images/icon-large.png'),
			})
			playerLog.debug('播放器能力设置完成')
			// 设置重复模式为 Off
			await TrackPlayer.setRepeatMode(RepeatMode.Off)
		} catch (error: unknown) {
			playerLog.sentry('初始化播放器失败', error)
		}
	},

	// 设置事件监听器
	setupEventListeners(): void {
		playerLog.debug('开始设置事件监听器')

		// 监听播放状态变化
		playerLog.debug('设置播放状态变化监听器')
		TrackPlayer.addEventListener(
			Event.PlaybackState,
			async (data: { state: TrackPlayerState }) => {
				const { state } = data
				const setter = usePlayerStore.setState
				const store = usePlayerStore.getState()
				const currentTrack = store.currentTrackKey
					? (store.tracks[store.currentTrackKey] ?? null)
					: null

				// 获取状态名称用于日志
				const stateName =
					Object.keys(TrackPlayerState).find(
						(key) =>
							TrackPlayerState[key as keyof typeof TrackPlayerState] === state,
					) || state.toString()

				if (state === TrackPlayerState.Playing) {
					playerLog.debug('播放状态: 播放中', {
						trackId: currentTrack?.id,
						title: currentTrack?.title,
					})
					setter((state) => ({ ...state, isPlaying: true, isBuffering: false }))
				} else if (
					state === TrackPlayerState.Paused ||
					state === TrackPlayerState.Stopped
				) {
					playerLog.debug('播放状态: 暂停/停止', {
						state: stateName,
						trackId: currentTrack?.id,
						title: currentTrack?.title,
					})
					setter((state) => ({
						...state,
						isPlaying: false,
						isBuffering: false,
					}))
				} else if (
					state === TrackPlayerState.Buffering ||
					state === TrackPlayerState.Loading
				) {
					playerLog.debug('播放状态: 缓冲中/加载中', {
						state: stateName,
						trackId: currentTrack?.id,
						title: currentTrack?.title,
					})
					setter((state) => ({ ...state, isBuffering: true }))
				} else if (state === TrackPlayerState.Ready) {
					playerLog.debug('播放状态: 就绪', {
						trackId: currentTrack?.id,
						title: currentTrack?.title,
					})
					setter((state) => ({ ...state, isBuffering: false }))
				}
			},
		)
		playerLog.debug('播放状态变化监听器设置完成')

		// 监听播放完成
		playerLog.debug('设置播放完成监听器')
		TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
			const store = usePlayerStore.getState()
			const { repeatMode } = store

			playerLog.debug('播放队列结束（即单曲结束）', {
				repeatMode,
			})

			// 单曲结束后的行为
			if (repeatMode !== RepeatMode.Track) {
				await store.skipToNext()
			}
		})

		// 监听播放错误
		playerLog.debug('设置播放错误监听器')
		TrackPlayer.addEventListener(
			Event.PlaybackError,
			async (data: { code: string; message: string }) => {
				if (data.code === 'android-io-bad-http-status') {
					playerLog.debug(
						'播放错误：服务器返回了错误状态码，重新加载曲目，但不上报错误',
					)
				} else {
					playerLog.sentry('播放错误', data)
				}
				const state = usePlayerStore.getState()
				const nowTrack = state.currentTrackKey
					? (state.tracks[state.currentTrackKey] ?? null)
					: null
				if (nowTrack) {
					playerLog.debug('当前播放的曲目', {
						trackId: nowTrack.id,
						title: nowTrack.title,
					})
					const track = await usePlayerStore
						.getState()
						.patchMetadataAndAudio(nowTrack)
					if (track.isErr()) {
						playerLog.sentry('更新音频流失败', track.error)
						return
					}
					playerLog.debug('更新音频流成功', {
						trackId: track.value.track.id,
						title: track.value.track.title,
					})
					// 使用 load 方法替换当前曲目
					const rntpTrack = convertToRNTPTrack(track.value.track)
					if (rntpTrack.isErr()) {
						playerLog.sentry('更新音频流失败', rntpTrack.error)
						return
					}
					await TrackPlayer.load(rntpTrack.value)
				}
			},
		)

		playerLog.debug('所有事件监听器设置完成')
	},
}

export { PlayerLogic, initPlayer }
