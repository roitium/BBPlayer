import NowPlayingBar from '@/components/NowPlayingBar'
import {
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import {
  Text,
  useTheme,
  Chip,
  Avatar,
  Surface,
  IconButton,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'
import { router } from 'expo-router'
import {
  usePopularVideos,
  useRecentlyPlayed,
  useSyncedPlaylists,
} from '@/hooks/api/useHomeData'
import type { Track, Playlist } from '@/types/core/media'

const mockCategories = [
  { id: '1', name: '华语', icon: 'music-note' },
  { id: '2', name: '流行', icon: 'music-note' },
  { id: '3', name: '摇滚', icon: 'music-note' },
  { id: '4', name: '民谣', icon: 'music-note' },
  { id: '5', name: '电子', icon: 'music-note' },
  { id: '6', name: '说唱', icon: 'music-note' },
]

const HomePage = () => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)

  // useRefreshQueriesOnFocus([
  //   homeQueryKeys.recentlyPlayed(),
  //   homeQueryKeys.playlists(),
  //   homeQueryKeys.popularVideos(),
  // ])

  let {
    data: recentlyPlayed,
    isLoading: recentlyPlayedLoading,
    refetch: recentlyPlayedRefetch,
  } = useRecentlyPlayed()

  const {
    data: playlists,
    isLoading: playlistsLoading,
    refetch: playlistsRefetch,
  } = useSyncedPlaylists()
  let {
    data: popularVideos,
    isLoading: popularVideosLoading,
    refetch: popularVideosRefetch,
  } = usePopularVideos()

  if (!recentlyPlayedLoading) recentlyPlayed = recentlyPlayed?.slice(0, 10)
  if (!popularVideosLoading) popularVideos = popularVideos?.slice(0, 10)

  const onRefresh = () => {
    setRefreshing(true)
    recentlyPlayedRefetch()
    popularVideosRefetch()
    playlistsRefetch()
    setRefreshing(false)
  }

  // 渲染最近播放项
  const renderRecentItem = (item: Track) => (
    <TouchableOpacity
      key={item.id}
      className='mb-2'
      activeOpacity={0.7}
      onPress={() => router.push('/player')}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={0}
      >
        <View className='flex-row items-center p-2'>
          <Image
            source={{ uri: item.cover }}
            className='h-12 w-12 rounded'
          />
          <View className='ml-3 flex-1'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View className='flex-row items-center'>
              <Text
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                {item.artist}
              </Text>
              <Text
                className='mx-1'
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                •
              </Text>
              <Text
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                {item.duration}
              </Text>
            </View>
          </View>
          <IconButton
            icon='play-circle-outline'
            iconColor={colors.primary}
            size={24}
            onPress={() => router.push('/player')}
          />
        </View>
      </Surface>
    </TouchableOpacity>
  )

  // 渲染推荐项
  const renderForYouItem = (item: Track) => (
    <TouchableOpacity
      key={item.id}
      className='mr-4 w-32'
      activeOpacity={0.7}
      onPress={() => router.push('/player')}
    >
      <Image
        source={{ uri: item.cover }}
        className='h-32 w-32 rounded-lg'
      />
      <View className='mt-2'>
        <Text
          variant='titleSmall'
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          variant='bodySmall'
          style={{ color: colors.onSurfaceVariant }}
          numberOfLines={1}
        >
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  )

  // 渲染播放列表项
  const renderPlaylistItem = (item: Playlist) => (
    <TouchableOpacity
      key={item.id}
      className='mr-4 w-40'
      activeOpacity={0.7}
      onPress={() => {}}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={1}
      >
        <Image
          source={{ uri: item.cover }}
          className='h-40 w-40 rounded-lg'
        />
        <View className='p-2'>
          <Text
            variant='titleSmall'
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            variant='bodySmall'
            style={{ color: colors.onSurfaceVariant }}
          >
            {item.count} 首歌曲
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  )

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* 顶部欢迎区域 */}
        <View
          className='px-4 pt-2 pb-4'
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className='flex-row items-center justify-between'>
            <View>
              <Text
                variant='headlineSmall'
                style={{ fontWeight: 'bold' }}
              >
                BiliMusic
              </Text>
              <Text
                variant='bodyMedium'
                style={{ color: colors.onSurfaceVariant }}
              >
                我只想听点音乐，拜托让一切简单点
              </Text>
            </View>
            <Avatar.Image
              size={40}
              source={{ uri: 'https://i.pravatar.cc/300' }}
            />
          </View>
        </View>

        {/* 分类选择区 */}
        <View className='mb-4 px-4'>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {mockCategories.map((category) => (
              <Chip
                key={category.id}
                icon={category.icon}
                onPress={() => {}}
                style={{ marginRight: 8 }}
                mode='outlined'
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* 最近播放 */}
        <View className='mb-6 px-4'>
          <View className='mb-2 flex-row items-center justify-between'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              最近播放
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                查看全部
              </Text>
            </TouchableOpacity>
          </View>
          {recentlyPlayed?.map(renderRecentItem)}
        </View>

        {/* 为你推荐 */}
        <View className='mb-6'>
          <View className='mb-2 flex-row items-center justify-between px-4'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              为你推荐
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                更多
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
          >
            {popularVideos?.map(renderForYouItem)}
          </ScrollView>
        </View>

        {/* 你的播放列表 */}
        <View className='mb-6'>
          <View className='mb-2 flex-row items-center justify-between px-4'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              你的播放列表
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                查看全部
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
          >
            {playlists?.map(renderPlaylistItem)}
          </ScrollView>
        </View>
      </ScrollView>

      {/* 当前播放栏 */}
      <View className='absolute right-0 bottom-0 left-0'>
        <NowPlayingBar />
      </View>
    </View>
  )
}

export default HomePage
