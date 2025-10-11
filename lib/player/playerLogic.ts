import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { ProjectScope } from '@/types/core/scope'
import log, { reportErrorToSentry } from '@/utils/log'
import toast from '@/utils/toast'
import TrackPlayer, {
	AppKilledPlaybackBehavior,
	Capability,
	Event,
	RepeatMode,
	State as TrackPlayerState,
} from 'react-native-track-player'

const logger = log.extend('Player.Init')

const initPlayer = async () => {
	logger.info('开始初始化播放器')
	if (global.playerIsReady) {
		logger.warning('播放器已经初始化过了')
		return
	}
	await PlayerLogic.preparePlayer()
	PlayerLogic.setupEventListeners()
	// 初始化后强制将 RNTP 重复模式设为 Off，循环由我们内部管理
	await TrackPlayer.setRepeatMode(RepeatMode.Off)
	global.playerIsReady = true
	logger.info('播放器初始化完成')
}

const PlayerLogic = {
	// 初始化播放器
	async preparePlayer(): Promise<void> {
		try {
			const setup = async () => {
				try {
					await TrackPlayer.setupPlayer({
						minBuffer: 15,
						maxBuffer: 300,
						backBuffer: 40,
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

			// 设置播放器能力（怕自己忘了记一下：如果想修改这些能力对应的函数调用，要去 /lib/services/playbackService 里改）
			await TrackPlayer.updateOptions({
				capabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.Stop,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
					Capability.SeekTo,
				],
				progressUpdateEventInterval: 0.2,
				android: {
					appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
				},
				// FIXME: wtf??? rntp 5.0 没法设置 icon 了
			})
			// 设置重复模式为 Off
			await TrackPlayer.setRepeatMode(RepeatMode.Off)
		} catch (error: unknown) {
			logger.error('初始化播放器失败', error)
			reportErrorToSentry(error, '初始化播放器失败', ProjectScope.Player)
		}
	},

	// 设置事件监听器
	setupEventListeners(): void {
		// 监听播放状态变化
		TrackPlayer.addEventListener(
			Event.PlaybackState,
			(data: { state: TrackPlayerState }) => {
				const { state } = data

				if (state === TrackPlayerState.Playing) {
					usePlayerStore.setState((state) => ({
						...state,
						isPlaying: true,
						isBuffering: false,
					}))
				} else if (
					state === TrackPlayerState.Paused ||
					state === TrackPlayerState.Stopped
				) {
					usePlayerStore.setState(() => ({
						isPlaying: false,
						isBuffering: false,
					}))
				} else if (
					state === TrackPlayerState.Buffering ||
					state === TrackPlayerState.Loading
				) {
					usePlayerStore.setState((state) => ({ ...state, isBuffering: true }))
				} else if (state === TrackPlayerState.Ready) {
					usePlayerStore.setState((state) => ({ ...state, isBuffering: false }))
				}
			},
		)

		// 监听播放完成
		TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
			const store = usePlayerStore.getState()
			const { repeatMode } = store

			logger.debug('播放队列结束（即单曲结束）', {
				repeatMode,
			})

			// 先记录当前曲目的播放记录（自然结束）
			await store._finalizeAndRecordCurrentPlay('ended')

			// 单曲结束后的行为
			if (repeatMode !== RepeatMode.Track) {
				await store.skipToNext()
			} else {
				await store.seekTo(0)
				await TrackPlayer.play()
				// 单曲循环：重置开始时间，用于下一次循环的统计
				usePlayerStore.setState((state) => ({
					...state,
					currentPlayStartAt: Date.now(),
				}))
			}
		})

		// 监听播放错误
		TrackPlayer.addEventListener(
			Event.PlaybackError,
			(data: { code: string; message: string }) => {
				if (
					data.code === 'android-io-bad-http-status' ||
					data.code === 'android-io-network-connection-failed'
				) {
					logger.debug('播放错误：服务器返回了错误状态码或加载失败')
					toast.error('播放错误：服务器返回了错误状态码或加载失败', {
						duration: Number.POSITIVE_INFINITY,
					})
					usePlayerStore.setState((state) => ({
						...state,
						isPlaying: false,
						isBuffering: false,
					}))
					return
				} else if (data.code === 'android-parsing-container-unsupported') {
					logger.error('播放错误：本地文件损坏')
					toast.error('播放错误：本地文件损坏，请重新下载或删除', {
						duration: Number.POSITIVE_INFINITY,
					})
					usePlayerStore.setState((state) => ({
						...state,
						isPlaying: false,
						isBuffering: false,
					}))
					return
				} else if (data.code === 'android-io-file-not-found') {
					logger.error('播放错误：本地文件不存在')
					toast.error('播放错误：本地文件不存在，你是否移动了文件？', {
						duration: Number.POSITIVE_INFINITY,
					})
					usePlayerStore.setState((state) => ({
						...state,
						isPlaying: false,
						isBuffering: false,
					}))
					return
				} else {
					logger.error('播放错误', data)
					toast.error(`播放错误: ${data.code} ${data.message}`, {
						duration: Number.POSITIVE_INFINITY,
					})
					reportErrorToSentry(
						new Error(`播放错误: ${data.code} ${data.message}`),
						'播放错误',
						ProjectScope.Player,
					)
					usePlayerStore.setState((state) => ({
						...state,
						isPlaying: false,
						isBuffering: false,
					}))
				}
				// const state = usePlayerStore.getState()
				// const nowTrack = state.currentTrackUniqueKey
				// 	? (state.tracks[state.currentTrackUniqueKey] ?? null)
				// 	: null
				// if (nowTrack) {
				// 	logger.debug('当前播放的曲目', {
				// 		trackId: nowTrack.id,
				// 		title: nowTrack.title,
				// 	})
				// 	const track = await usePlayerStore.getState().patchAudio(nowTrack)
				// 	if (track.isErr()) {
				// 		logger.error('更新音频流失败', track.error)
				// 		return
				// 	}
				// 	logger.debug('更新音频流成功', {
				// 		trackId: track.value.track.id,
				// 		title: track.value.track.title,
				// 	})
				// 	// 使用 load 方法替换当前曲目
				// 	const rntpTrack = convertToRNTPTrack(track.value.track)
				// 	if (rntpTrack.isErr()) {
				// 		logger.error('将 Track 转换为 RNTPTrack 失败', rntpTrack.error)
				// 		return
				// 	}
				// 	await TrackPlayer.load(rntpTrack.value)
				// }
			},
		)
	},
}

export { initPlayer, PlayerLogic }
