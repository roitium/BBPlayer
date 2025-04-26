import { router } from 'expo-router'
import { useEffect } from 'react'
import { Image, TouchableOpacity, View } from 'react-native'
import {
  IconButton,
  ProgressBar,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper'
import { usePlaybackProgress, usePlayerStore } from '@/lib/store/usePlayerStore'

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
      style={{
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: colors.elevation.level5,
      }}
      elevation={2}
    >
      <TouchableOpacity
        style={{ position: 'relative' }}
        onPress={() => {
          router.push('/player')
        }}
        activeOpacity={0.9}
      >
        <ProgressBar
          animatedValue={progress.position / progress.duration}
          color={colors.primary}
          style={{ height: 2 }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
          }}
        >
          <Image
            source={{ uri: currentTrack.cover }}
            style={{ height: 48, width: 48, borderRadius: 6 }}
          />

          <View
            style={{
              marginLeft: 12,
              flex: 1,
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
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

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <IconButton
              icon='skip-previous'
              size={24}
              onPress={usePlayerStore.getState().skipToPrevious}
              iconColor={colors.onSurface}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={24}
              onPress={usePlayerStore.getState().togglePlay}
              iconColor={colors.primary}
              style={{ marginHorizontal: 0 }}
            />
            <IconButton
              icon='skip-next'
              size={24}
              onPress={usePlayerStore.getState().skipToNext}
              iconColor={colors.onSurface}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  )
}
