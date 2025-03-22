import TrackPlayer, { Event } from 'react-native-track-player'
import { usePlayerStore } from '../store/usePlayerStore'

export const PlaybackService = async () => {
  // 播放控制
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    usePlayerStore.getState().skipToNext()
  })
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    usePlayerStore.getState().skipToPrevious(),
  )

  // 跳转控制
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position)
  })

  // 停止控制
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset()
  })

  // 跳转到指定曲目
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const position = await TrackPlayer.getProgress().then(
      (progress) => progress.position,
    )
    const jumpAmount = event.interval || 10 // 默认跳转10秒
    TrackPlayer.seekTo(position + jumpAmount)
  })

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const position = await TrackPlayer.getProgress().then(
      (progress) => progress.position,
    )
    const jumpAmount = event.interval || 10 // 默认跳转10秒
    TrackPlayer.seekTo(Math.max(0, position - jumpAmount))
  })
}
