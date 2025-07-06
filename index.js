import { AppRegistry } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import Main from './app/layout'
import { PlaybackService } from './lib/player/playbackService'

// 定义一个全局变量，避免二次初始化 player
global.playerIsReady = false

TrackPlayer.registerPlaybackService(() => PlaybackService)

AppRegistry.registerComponent('main', () => Main)
