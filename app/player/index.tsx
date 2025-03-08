import { router, Stack } from 'expo-router'
import { useState } from 'react'
import { View, Image, ScrollView, TouchableOpacity, Text } from 'react-native'
import { IconButton, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function PlayerPage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [isPlaying, setIsPlaying] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off', 'all', 'one'
  const [shuffleMode, setShuffleMode] = useState(false)
  const [viewMode, setViewMode] = useState('cover') // 'cover' or 'lyrics'
  const [currentTime, setCurrentTime] = useState(85) // seconds
  const [duration, setDuration] = useState(255) // seconds

  // Mock song data
  const songData = {
    id: 1,
    title: 'Beach Walk',
    artist: 'Cloudscape',
    album: 'Summer Dreams EP',
    cover: 'https://via.placeholder.com/300',
    source: 'bilibili',
    lyrics: [
      { time: 0, text: '[Instrumental Intro]' },
      { time: 15, text: 'Walking by the ocean' },
      { time: 30, text: 'Feeling the sand beneath my feet' },
      { time: 45, text: 'Sun setting on the horizon' },
      { time: 60, text: 'This moment is so sweet' },
      { time: 75, text: 'Waves crashing gently' },
      { time: 90, text: 'Against the golden shore' },
      { time: 105, text: 'Summer memories lasting' },
      { time: 120, text: 'Forevermore' },
      { time: 135, text: '[Instrumental Break]' },
      { time: 165, text: 'Beach walks and sunsets' },
      { time: 180, text: 'Creating memories that stay' },
      { time: 195, text: 'In the warmth of summer' },
      { time: 210, text: 'Perfect end to the day' },
      { time: 225, text: 'Perfect end to the day...' },
    ],
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Find current lyric
  const getCurrentLyric = () => {
    for (let i = songData.lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= songData.lyrics[i].time) {
        return i
      }
    }
    return 0
  }

  const currentLyricIndex = getCurrentLyric()

  // Toggle repeat mode
  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all')
    else if (repeatMode === 'all') setRepeatMode('one')
    else setRepeatMode('off')
  }

  // Toggle between cover and lyrics view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'cover' ? 'lyrics' : 'cover')
  }

  return (
    <View
      className='flex-1'
      style={{ paddingTop: insets.top, backgroundColor: colors.primary }}
    >
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />
      {/* Header */}
      <View className='flex-row items-center p-4'>
        <IconButton
          icon='chevron-down'
          size={24}
          iconColor={colors.onPrimary}
          onPress={() => {
            router.back()
          }}
        />
        <View className='flex-1 items-center'>
          <Text
            className='text-sm'
            style={{ color: colors.onPrimary }}
          >
            Now Playing
          </Text>
        </View>
        <IconButton
          icon='dots-vertical'
          size={24}
          iconColor={colors.onPrimary}
          onPress={() => {}}
        />
      </View>

      {/* Content Area (Flexible) */}
      <View className='flex-1 items-center justify-center px-6'>
        {/* Cover View */}
        {viewMode === 'cover' && (
          <TouchableOpacity
            className='w-full items-center'
            onPress={toggleViewMode}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: songData.cover }}
              className='mb-6 h-[260px] w-[260px] rounded-xl'
              resizeMode='cover'
            />

            <View className='w-full items-center'>
              <Text
                className='mb-1 font-bold text-xl'
                style={{ color: colors.onPrimary }}
              >
                {songData.title}
              </Text>
              <Text style={{ color: colors.onPrimary }}>{songData.artist}</Text>
              <Text
                className='mt-0.5 text-sm'
                style={{ color: colors.onPrimaryContainer }}
              >
                {songData.album}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Lyrics View */}
        {viewMode === 'lyrics' && (
          <TouchableOpacity
            className='w-full flex-1'
            onPress={toggleViewMode}
            activeOpacity={0.9}
          >
            <ScrollView className='h-[260px]'>
              {songData.lyrics.map((line, index) => (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: I love my array indexes
                  key={`lyric_row_${index}`}
                  className='py-2'
                >
                  <Text
                    className='text-center'
                    style={{
                      color: colors.onPrimary,
                      fontSize: index === currentLyricIndex ? 18 : 14,
                      fontWeight:
                        index === currentLyricIndex ? 'bold' : 'normal',
                      opacity: index === currentLyricIndex ? 1.0 : 0.7,
                    }}
                  >
                    {line.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        )}
      </View>

      {/* Fixed Controls Area */}
      <View className='px-6 pb-6'>
        {/* Progress Bar */}
        <View className='mb-4'>
          <View className='mb-1 flex-row justify-between'>
            <Text
              className='text-xs'
              style={{ color: colors.onPrimary }}
            >
              {formatTime(currentTime)}
            </Text>
            <Text
              className='text-xs'
              style={{ color: colors.onPrimary }}
            >
              {formatTime(duration)}
            </Text>
          </View>
          <View
            className='h-1 overflow-hidden rounded'
            style={{ backgroundColor: colors.primaryContainer }}
          >
            <View
              className='h-full rounded'
              style={{
                backgroundColor: colors.inversePrimary,
                width: `${(currentTime / duration) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Playback Controls */}
        <View className='mb-6 flex-row items-center justify-between'>
          <IconButton
            icon='shuffle'
            size={20}
            iconColor={
              shuffleMode ? colors.inversePrimary : colors.onPrimaryContainer
            }
            onPress={() => setShuffleMode(!shuffleMode)}
          />

          <IconButton
            icon='skip-previous'
            size={24}
            iconColor={colors.onPrimary}
            onPress={() => {}}
          />

          <TouchableOpacity
            className='h-16 w-16 items-center justify-center rounded-full'
            style={{ backgroundColor: colors.surface }}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={32}
              iconColor={colors.primary}
              onPress={() => setIsPlaying(!isPlaying)}
            />
          </TouchableOpacity>

          <IconButton
            icon='skip-next'
            size={24}
            iconColor={colors.onPrimary}
            onPress={() => {}}
          />

          <View>
            <IconButton
              icon='repeat'
              size={20}
              iconColor={
                repeatMode !== 'off'
                  ? colors.inversePrimary
                  : colors.onPrimaryContainer
              }
              onPress={cycleRepeatMode}
            />
            {repeatMode === 'one' && (
              <Text
                className='absolute top-[18px] left-[23px] font-bold text-xs'
                style={{ color: colors.inversePrimary }}
              >
                1
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Actions */}
        <View className='flex-row items-center justify-between'>
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            iconColor={isFavorite ? colors.error : colors.onPrimaryContainer}
            onPress={() => setIsFavorite(!isFavorite)}
          />

          <View className='flex-row items-center'>
            <IconButton
              icon='volume-high'
              size={20}
              iconColor={colors.onPrimaryContainer}
            />
            <View
              className='h-1 w-24 overflow-hidden rounded'
              style={{ backgroundColor: colors.primaryContainer }}
            >
              <View
                className='h-full w-4/5'
                style={{ backgroundColor: colors.onPrimaryContainer }}
              />
            </View>
          </View>

          <IconButton
            icon='playlist-music'
            size={24}
            iconColor={colors.onPrimaryContainer}
            onPress={() => {}}
          />
        </View>
      </View>
    </View>
  )
}
