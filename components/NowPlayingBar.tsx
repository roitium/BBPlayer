import { usePlaybackProgress, usePlayerStore } from '@/lib/store/usePlayerStore'
import { router } from 'expo-router'
import { View, Image, TouchableOpacity } from 'react-native'
import {
  IconButton,
  Text,
  Surface,
  useTheme,
  ProgressBar,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

export default function NowPlayingBar() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { currentTrack, isPlaying, skipToNext, skipToPrevious } =
    usePlayerStore()
  const progress = usePlaybackProgress()

  if (!currentTrack) return null

  return (
    <Surface
      className='mx-2 mb-2 overflow-hidden rounded-xl shadow-lg'
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
            source={{ uri: currentTrack?.cover }}
            className='h-12 w-12 rounded-md'
          />

          {/* 歌曲信息 */}
          <View className='ml-3 flex-1 justify-center'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
              style={{ color: colors.onSurface }}
            >
              {currentTrack?.title}
            </Text>
            <Text
              variant='bodySmall'
              numberOfLines={1}
              style={{ color: colors.onSurfaceVariant }}
            >
              {currentTrack?.artist}
            </Text>
          </View>

          {/* 控制按钮 */}
          <View className='flex-row items-center'>
            <IconButton
              icon='skip-previous'
              size={24}
              onPress={() => {
                skipToPrevious()
              }}
              iconColor={colors.onSurfaceVariant}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={24}
              onPress={() => {
                isPlaying ? TrackPlayer.pause() : TrackPlayer.play()
              }}
              iconColor={colors.primary}
              style={{ margin: 0 }}
            />
            <IconButton
              icon='skip-next'
              size={24}
              onPress={() => {
                skipToNext()
              }}
              iconColor={colors.onSurfaceVariant}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  )
}
