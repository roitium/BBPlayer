import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { View, ScrollView, Image, TouchableOpacity } from 'react-native'
import {
  Text,
  useTheme,
  Surface,
  IconButton,
  Menu,
  ActivityIndicator,
  Appbar,
  Divider,
} from 'react-native-paper'
import NowPlayingBar from '@/components/NowPlayingBar'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import { formatDurationToHHMM } from '@/utils/times'
import type { Track } from '@/types/core/media'
import { useFavoriteData } from '@/hooks/api/useFavoriteData'

export default function PlaylistPage() {
  const { favorite } = useLocalSearchParams()
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const { addToQueue, clearQueue } = usePlayerStore()
  const { bilibiliApi } = useAppStore()

  // 播放单曲（清空队列后播放）
  const playSingleTrack = async (track: Track) => {
    try {
      await clearQueue()
      await addToQueue([track])
    } catch (error) {
      console.error('播放单曲失败', error)
    }
  }

  // 添加到队列
  const addTrackToQueue = async (track: Track) => {
    try {
      await addToQueue([track])
    } catch (error) {
      console.error('添加到队列失败', error)
    }
  }

  // 播放全部
  const playAll = async () => {
    try {
      await clearQueue()
      await addToQueue(favoriteData?.tracks || [])
    } catch (error) {
      console.error('播放全部失败', error)
    }
  }

  // 获取收藏夹数据
  const { data: favoriteData, isLoading: favoriteDataLoading } =
    useFavoriteData(bilibiliApi, Number(favorite), 1)

  // 渲染歌曲项
  const renderTrackItem = (item: Track, index: number) => {
    return (
      <TouchableOpacity
        key={item.id}
        className='mb-2'
        activeOpacity={0.7}
        onPress={() => playSingleTrack(item)}
      >
        <Surface
          className='overflow-hidden rounded-lg'
          elevation={0}
        >
          <View className='flex-row items-center p-2'>
            <Text
              variant='titleMedium'
              style={{
                width: 40,
                textAlign: 'center',
                color: colors.onSurfaceVariant,
              }}
            >
              {index + 1}
            </Text>
            <Image
              source={{ uri: item.cover }}
              className='rounded'
              style={{ width: 48, height: 48 }}
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
                  {formatDurationToHHMM(item.duration)}
                </Text>
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon='dots-vertical'
                  iconColor={colors.onSurfaceVariant}
                  size={24}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
              anchorPosition='bottom'
            >
              <Menu.Item
                leadingIcon='play-circle'
                onPress={() => {
                  playSingleTrack(item)
                  setMenuVisible(null)
                }}
                title='立即播放'
              />
              <Menu.Item
                leadingIcon='playlist-plus'
                onPress={() => {
                  addTrackToQueue(item)
                  setMenuVisible(null)
                }}
                title='添加到播放队列'
              />
            </Menu>
          </View>
        </Surface>
      </TouchableOpacity>
    )
  }

  if (favoriteDataLoading) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator
          size='large'
          color={colors.primary}
        />
      </View>
    )
  }

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      <Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 500 }}>
        <Appbar.BackAction
          onPress={() => {
            router.back()
          }}
        />
      </Appbar.Header>

      {/* 顶部背景图 */}
      <View className='absolute h-full w-full'>
        <Image
          source={{ uri: favoriteData?.favoriteMeta.cover }}
          style={{
            width: '100%',
            height: '100%',
            opacity: 0.3,
          }}
          blurRadius={10}
        />
      </View>

      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* 顶部收藏夹信息 */}
        <View className='relative flex flex-col'>
          {/* 收藏夹信息 */}
          <View className='flex flex-row p-4'>
            <Image
              source={{ uri: favoriteData?.favoriteMeta.cover }}
              style={{ width: 120, height: 120, borderRadius: 8 }}
            />
            <View className='ml-4 flex-1 justify-center'>
              <Text
                variant='titleLarge'
                style={{ fontWeight: 'bold' }}
                numberOfLines={2}
              >
                {favoriteData?.favoriteMeta.title}
              </Text>
              <Text
                variant='bodyMedium'
                numberOfLines={1}
              >
                {favoriteData?.favoriteMeta.upper.name} •{' '}
                {favoriteData?.favoriteMeta.media_count} 首歌曲
              </Text>
            </View>
          </View>

          {/* 描述和操作按钮 */}
          <View className='flex flex-row items-center justify-between p-4'>
            <Text
              variant='bodyMedium'
              numberOfLines={2}
            >
              {favoriteData?.favoriteMeta.intro}
            </Text>

            <IconButton
              mode='contained'
              icon='play'
              onPress={playAll}
            />
          </View>

          <Divider />
        </View>
        {/* 歌曲列表 */}
        <View className='px-4 pt-4'>
          {favoriteData?.tracks.map((track, index) =>
            renderTrackItem(track, index),
          )}
        </View>
      </ScrollView>

      {/* 当前播放栏 */}
      <View className='absolute right-0 bottom-0 left-0'>
        <NowPlayingBar />
      </View>
    </View>
  )
}
