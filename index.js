import TrackPlayer from 'react-native-track-player'
import { PlaybackService } from './lib/services/playbackService'

// 定义一个全局变量，避免二次初始化 player
global.playerIsReady = false

TrackPlayer.registerPlaybackService(() => PlaybackService)

import 'expo-router/entry'
