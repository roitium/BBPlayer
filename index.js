import { AppRegistry } from 'react-native'
import { name as appName } from './app.json'
import { PlaybackService } from './lib/services/playbackService'
import TrackPlayer from 'react-native-track-player'

// 定义一个全局变量，避免二次初始化 player
global.playerIsReady = false

AppRegistry.registerComponent(appName, () => App)

TrackPlayer.registerPlaybackService(() => PlaybackService)

import 'expo-router/entry'
