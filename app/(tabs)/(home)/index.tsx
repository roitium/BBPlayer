import NowPlayingBar from '@/components/NowPlayingBar'
import { ScrollView, View, Image, TouchableOpacity } from 'react-native'
import { Text, Appbar, useTheme, ActivityIndicator } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useRecentlyPlayed,
  usePopularVideos,
  useSyncedPlaylists,
} from '@/hooks/api/useHomeData'
import type { Track, Playlist } from '@/hooks/api/types'

const MusicPlayerApp = () => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  let { data: recentlyPlayed = [], isLoading: isLoadingRecent } =
    useRecentlyPlayed()

  let { data: popularVideos = [], isLoading: isLoadingPopularVideos } =
    usePopularVideos()

  const { data: syncedPlaylists = [], isLoading: isLoadingPlaylists } =
    useSyncedPlaylists()

  if (!isLoadingRecent) {
    recentlyPlayed =
      recentlyPlayed.length > 10 ? recentlyPlayed.slice(0, 10) : recentlyPlayed
  }

  if (!isLoadingPopularVideos) {
    popularVideos =
      popularVideos.length > 10 ? popularVideos.slice(0, 10) : popularVideos
  }

  return (
    <View className='flex-1'>
      {/* App Bar */}
      <Appbar.Header
        style={{
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: colors.primary,
        }}
      >
        {/* <View className='ml-2'>
          <Text className='font-bold text-lg text-white'>SoundBridge</Text>
          <Text className='text-white text-xs opacity-80'>
            Connect · Sync · Play
          </Text>
        </View> */}
        <Appbar.Content
          title='SoundBridge'
          color={colors.onPrimary}
        />
      </Appbar.Header>
      {/* Main Content */}
      <ScrollView className='flex-1'>
        {/* Recently Played Section */}
        <View className='mb-2 p-4'>
          <Text
            className='mb-3 font-bold text-lg'
            style={{ color: colors.primary }}
          >
            Recently Played
          </Text>

          {isLoadingRecent ? (
            <ActivityIndicator />
          ) : (
            recentlyPlayed.map((item: Track) => (
              <TouchableOpacity
                key={item.id}
                className='mb-2 flex-row items-center rounded-lg p-2'
                style={{ backgroundColor: colors.surface }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.cover }}
                  className='h-12 w-12 rounded'
                />
                <View className='ml-3 flex-1'>
                  <Text
                    className='font-medium'
                    style={{ color: colors.onSurface }}
                  >
                    {item.title}
                  </Text>
                  <View className='flex-row items-center'>
                    <Text
                      className='text-xs'
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      {item.artist}
                    </Text>
                    <Text
                      className='mx-1 text-xs'
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      •
                    </Text>
                    <View className='rounded bg-gray-100 px-1.5 py-0.5'>
                      <Text
                        className='text-xs'
                        style={{ color: colors.secondary }}
                      >
                        {item.source === 'ytbmusic' ? 'YTB' : 'BiliBili'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  className='text-xs'
                  style={{ color: colors.onSurfaceVariant }}
                >
                  {item.duration}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recommendations */}
        <View className='mb-2 p-4'>
          <Text
            className='mb-3 font-bold text-lg'
            style={{ color: colors.primary }}
          >
            For You
          </Text>

          {isLoadingPopularVideos ? (
            <ActivityIndicator />
          ) : (
            <View className='flex-row flex-wrap justify-between'>
              {popularVideos.map((item: Track) => (
                <TouchableOpacity
                  key={item.id}
                  className='mb-4 w-[48%] overflow-hidden rounded-lg'
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.cover }}
                    className='h-32 w-full rounded-lg'
                  />
                  <View className='mt-1'>
                    <Text
                      className='font-medium'
                      style={{ color: colors.onSurface }}
                    >
                      {item.title}
                    </Text>
                    <View className='flex-row items-center'>
                      <Text
                        className='text-xs'
                        style={{ color: colors.onSurfaceVariant }}
                      >
                        {item.artist}
                      </Text>
                      <View className='ml-1 rounded bg-gray-100 px-1 py-0.5'>
                        <Text
                          className='text-xs'
                          style={{ color: colors.secondary }}
                        >
                          {item.source === 'ytbmusic' ? 'YTB' : 'BiliBili'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Synced Playlists */}
        <View className='mb-16 p-4'>
          <Text
            className='mb-3 font-bold text-lg'
            style={{ color: colors.primary }}
          >
            Your Library
          </Text>

          {isLoadingPlaylists ? (
            <ActivityIndicator />
          ) : (
            syncedPlaylists.map((playlist: Playlist) => (
              <TouchableOpacity
                key={playlist.id}
                className='mb-2 flex-row items-center rounded-lg p-2'
                style={{ backgroundColor: colors.surface }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: playlist.cover }}
                  className='h-16 w-16 rounded'
                />
                <View className='ml-3'>
                  <Text
                    className='font-medium'
                    style={{ color: colors.onSurface }}
                  >
                    {playlist.title}
                  </Text>
                  <View className='flex-row items-center'>
                    <Text
                      className='text-xs'
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      {playlist.count} tracks •
                    </Text>
                    <View className='ml-1 rounded bg-gray-100 px-1 py-0.5'>
                      <Text
                        className='text-xs'
                        style={{ color: colors.secondary }}
                      >
                        {playlist.source === 'ytbmusic'
                          ? 'YTB'
                          : playlist.source === 'bilibili'
                            ? 'BiliBili'
                            : 'Mixed'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Currently Playing Bar */}
      <NowPlayingBar />
    </View>
  )
}

export default MusicPlayerApp
