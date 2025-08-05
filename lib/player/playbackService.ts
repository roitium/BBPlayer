import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import TrackPlayer, { Event } from 'react-native-track-player'

export const PlaybackService = () => {
	// 播放控制
	TrackPlayer.addEventListener(Event.RemotePlay, () => {
		if (usePlayerStore.getState().isPlaying) return
		void usePlayerStore.getState().togglePlay()
	})
	TrackPlayer.addEventListener(Event.RemotePause, () => {
		if (!usePlayerStore.getState().isPlaying) return
		void usePlayerStore.getState().togglePlay()
	})
	TrackPlayer.addEventListener(Event.RemoteNext, () => {
		void usePlayerStore.getState().skipToNext()
	})
	TrackPlayer.addEventListener(Event.RemotePrevious, () =>
		usePlayerStore.getState().skipToPrevious(),
	)

	// 跳转控制
	TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
		void usePlayerStore.getState().seekTo(event.position)
	})

	// 停止控制
	TrackPlayer.addEventListener(Event.RemoteStop, () => {
		void usePlayerStore.getState().resetStore()
	})
}
