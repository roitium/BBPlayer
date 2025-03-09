import TrackPlayer from 'react-native-track-player'
import { usePlayerStore } from '../store/usePlayerStore'

let isSetup = false

/**
 * 初始化播放器
 * 在应用启动时调用一次
 */
export const setupPlayer = async (): Promise<void> => {
  if (isSetup) return

  try {
    // 初始化播放器
    await usePlayerStore.getState().initPlayer()
    isSetup = true
  } catch (error) {
    console.error('初始化播放器失败:', error)
  }
}

/**
 * 重置播放器
 * 在应用退出或需要重置播放器时调用
 */
export const resetPlayer = async (): Promise<void> => {
  if (!isSetup) return

  try {
    await TrackPlayer.reset()
    isSetup = false
  } catch (error) {
    console.error('重置播放器失败:', error)
  }
}
