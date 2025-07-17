import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import TrackPlayer, { Event } from 'react-native-track-player'

export const PlaybackService = async () => {
	// 播放控制
	TrackPlayer.addEventListener(Event.RemotePlay, () => {
		if (usePlayerStore.getState().isPlaying) return
		usePlayerStore.getState().togglePlay()
	})
	TrackPlayer.addEventListener(Event.RemotePause, () => {
		if (!usePlayerStore.getState().isPlaying) return
		usePlayerStore.getState().togglePlay()
	})
	TrackPlayer.addEventListener(Event.RemoteNext, () => {
		usePlayerStore.getState().skipToNext()
	})
	TrackPlayer.addEventListener(Event.RemotePrevious, () =>
		usePlayerStore.getState().skipToPrevious(),
	)

	// 跳转控制
	TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
		usePlayerStore.getState().seekTo(event.position)
	})

	// 停止控制
	TrackPlayer.addEventListener(Event.RemoteStop, () => {
		usePlayerStore.getState().resetStore()
	})

	// TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
	//   const position = await TrackPlayer.getProgress().then(
	//     (progress) => progress.position,
	//   )
	//   const jumpAmount = event.interval || 10
	//   TrackPlayer.seekTo(position + jumpAmount)
	// })

	// TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
	//   const position = await TrackPlayer.getProgress().then(
	//     (progress) => progress.position,
	//   )
	//   const jumpAmount = event.interval || 10 // 默认跳转10秒
	//   TrackPlayer.seekTo(Math.max(0, position - jumpAmount))
	// })
}
