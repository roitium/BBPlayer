import { usePlaybackProgress, usePlayerStore } from '@/lib/store/usePlayerStore'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { View, Image, TouchableOpacity } from 'react-native'
import {
  IconButton,
  Text,
  Surface,
  useTheme,
  ProgressBar,
} from 'react-native-paper'

export default function NowPlayingBar() {
  const { colors } = useTheme()
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const progress = usePlaybackProgress(100)

  // biome-ignore lint/correctness/useExhaustiveDependencies: 当切歌时归零进度条，不需要 progress 作为 dep
  useEffect(() => {
    progress.position = 0
  }, [currentTrack])

  if (!currentTrack) return null

  return (
    <Surface
      className='mx-2 overflow-hidden rounded-xl shadow-lg'
      elevation={2}
    >
      <TouchableOpacity
        className='relative'
        onPress={() => {
          router.push('/player')
        }}
        activeOpacity={0.9}
      >
        {/* 进度条 */}
        <ProgressBar
          animatedValue={progress.position / progress.duration}
          color={colors.primary}
          style={{ height: 2 }}
        />

        <View className='flex-row items-center p-2'>
          {/* 封面 */}
          <Image
            source={{ uri: currentTrack.cover }}
            style={{ height: 48, width: 48, borderRadius: 6 }}
          />

          {/* 歌曲信息 */}
          <View className='ml-3 flex-1 justify-center'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {currentTrack?.title}
            </Text>
            <Text
              variant='bodySmall'
              numberOfLines={1}
            >
              {currentTrack?.artist}
            </Text>
          </View>

          {/* 控制按钮 */}
          <View className='flex-row items-center'>
            <IconButton
              icon='skip-previous'
              size={24}
              onPress={usePlayerStore.getState().skipToPrevious}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={24}
              onPress={usePlayerStore.getState().togglePlay}
              iconColor={colors.primary}
              style={{ margin: 0 }}
            />
            <IconButton
              icon='skip-next'
              size={24}
              onPress={usePlayerStore.getState().skipToNext}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  )
}
