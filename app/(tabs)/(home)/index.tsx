import { ScrollView, View, Image, TouchableOpacity } from 'react-native'
import { Text, Appbar, IconButton, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MusicPlayerApp = () => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  // 示例数据
  const recentlyPlayed = [
    {
      id: 1,
      title: 'Summer okokok Memories',
      artist: 'Cloudscape',
      cover: 'https://via.placeholder.com/60',
      source: 'ytbmusic',
      duration: '3:45',
    },
    {
      id: 2,
      title: 'Distant Dreams',
      artist: 'Echo Valley',
      cover: 'https://via.placeholder.com/60',
      source: 'bilibili',
      duration: '4:12',
    },
    {
      id: 3,
      title: 'Midnight Drive',
      artist: 'Neon Pulse',
      cover: 'https://via.placeholder.com/60',
      source: 'ytbmusic',
      duration: '3:28',
    },
  ]

  const recommendations = [
    {
      id: 4,
      title: 'Urban Rhythm',
      artist: 'City Lights',
      cover: 'https://via.placeholder.com/120',
      source: 'bilibili',
      duration: '5:02',
    },
    {
      id: 5,
      title: 'Ocean Waves',
      artist: 'Coastal',
      cover: 'https://via.placeholder.com/120',
      source: 'ytbmusic',
      duration: '4:30',
    },
    {
      id: 6,
      title: 'Mountain Echo',
      artist: 'Alpine',
      cover: 'https://via.placeholder.com/120',
      source: 'bilibili',
      duration: '3:56',
    },
    {
      id: 7,
      title: 'Starry Night',
      artist: 'Cosmos',
      cover: 'https://via.placeholder.com/120',
      source: 'ytbmusic',
      duration: '4:18',
    },
  ]

  const syncedPlaylists = [
    {
      id: 1,
      title: 'YTB Favorites',
      count: 42,
      cover: 'https://via.placeholder.com/80',
      source: 'ytbmusic',
    },
    {
      id: 2,
      title: 'Bilibili Collections',
      count: 28,
      cover: 'https://via.placeholder.com/80',
      source: 'bilibili',
    },
    {
      id: 3,
      title: 'Summer Mix',
      count: 15,
      cover: 'https://via.placeholder.com/80',
      source: 'mixed',
    },
  ]

  return (
    <>
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

          {recentlyPlayed.map((item) => (
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
          ))}
        </View>

        {/* Recommendations */}
        <View className='mb-2 p-4'>
          <Text
            className='mb-3 font-bold text-lg'
            style={{ color: colors.primary }}
          >
            For You
          </Text>

          <View className='flex-row flex-wrap justify-between'>
            {recommendations.map((item) => (
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
        </View>

        {/* Synced Playlists */}
        <View className='mb-16 p-4'>
          <Text
            className='mb-3 font-bold text-lg'
            style={{ color: colors.primary }}
          >
            Your Library
          </Text>

          {syncedPlaylists.map((playlist) => (
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
          ))}
        </View>
      </ScrollView>

      {/* Currently Playing Bar */}
      <View
        className='absolute right-0 bottom-0 left-0 flex-row items-center p-3 shadow-md'
        style={{ backgroundColor: colors.primaryContainer }}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/48' }}
          className='mr-3 h-12 w-12 rounded'
        />
        <View className='flex-1'>
          <Text
            className='font-medium'
            style={{ color: colors.onPrimaryContainer }}
          >
            Summer Memories
          </Text>
          <Text
            className='text-xs'
            style={{ color: colors.secondary }}
          >
            Cloudscape
          </Text>
        </View>
        <IconButton
          icon='play-circle'
          iconColor={colors.primary}
          size={36}
          onPress={() => {}}
        />
      </View>
    </>
  )
}

export default MusicPlayerApp
