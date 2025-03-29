import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { View, Image, FlatList, RefreshControl } from 'react-native'
import {
  Text,
  useTheme,
  Surface,
  IconButton,
  Menu,
  ActivityIndicator,
  Appbar,
  Divider,
  TouchableRipple,
} from 'react-native-paper'
import NowPlayingBar from '@/components/NowPlayingBar'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import { formatDurationToHHMMSS } from '@/utils/times'
import type { Track } from '@/types/core/media'
import {
  useBatchDeleteFavoriteListContents,
  useInfiniteFavoriteList,
} from '@/hooks/queries/useFavoriteData'
import { useQueryClient } from '@tanstack/react-query'

export default function PlaylistPage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const { mutate } = useBatchDeleteFavoriteListContents(
    bilibiliApi,
    queryClient,
  )

  // 下一首播放
  const playNext = async (track: Track) => {
    try {
      await addToQueue([track], false, false, undefined, true)
    } catch (error) {
      console.error('添加到队列失败', error)
    }
  }

  // 播放全部
  const playAll = async (startFromId?: string) => {
    try {
      const allContentIds = await bilibiliApi.getFavoriteListAllContents(
        Number(id),
      )
      const allTracks = allContentIds.map((c) => ({
        id: c.bvid,
        source: 'bilibili' as const,
        hasMetadata: false,
      }))
      await addToQueue(allTracks, true, true, startFromId)
    } catch (error) {
      console.error('播放全部失败', error)
    }
  }

  // 获取收藏夹数据
  const {
    data: favoriteData,
    isPending: isFavoriteDataPending,
    isError: isFavoriteDataError,
    fetchNextPage,
    refetch,
    hasNextPage,
  } = useInfiniteFavoriteList(bilibiliApi, Number(id))

  // 渲染歌曲项
  const TrackItem = ({ item, index }: { item: Track; index: number }) => {
    return (
      <TouchableRipple
        key={item.id}
        style={{ paddingVertical: 5 }}
        onPress={() => playAll(item.id)}
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
              <Text variant='titleMedium'>{item.title}</Text>
              <View className='flex-row items-center'>
                <Text variant='bodySmall'>{item.artist}</Text>
                <Text
                  className='mx-1'
                  variant='bodySmall'
                >
                  •
                </Text>
                <Text variant='bodySmall'>
                  {item.duration ? formatDurationToHHMMSS(item.duration) : ''}
                </Text>
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon='dots-vertical'
                  size={24}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
              anchorPosition='bottom'
            >
              <Menu.Item
                leadingIcon='play-circle-outline'
                onPress={() => {
                  playNext(item)
                  setMenuVisible(null)
                }}
                title='下一首播放'
              />
              <Menu.Item
                leadingIcon='playlist-remove'
                onPress={() => {
                  mutate({ bvids: [item.id], favoriteId: Number(id) })
                  setMenuVisible(null)
                }}
                title='从收藏夹中删除'
              />
            </Menu>
          </View>
        </Surface>
      </TouchableRipple>
    )
  }

  if (isFavoriteDataPending) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isFavoriteDataError) {
    return (
      <View className='flex-1 items-center justify-center'>
        <Text
          variant='titleMedium'
          className='text-center'
        >
          加载失败
        </Text>
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
          source={{ uri: favoriteData?.pages[0].favoriteMeta.cover }}
          style={{
            width: '100%',
            height: '100%',
            opacity: 0.15,
          }}
          blurRadius={15}
        />
      </View>

      <View
        className='flex-1'
        style={{ paddingBottom: currentTrack ? 80 : 0 }}
      >
        {/* 顶部收藏夹信息 */}
        <View className='relative flex flex-col'>
          {/* 收藏夹信息 */}
          <View className='flex flex-row p-4'>
            <Image
              source={{ uri: favoriteData?.pages[0].favoriteMeta.cover }}
              style={{ width: 120, height: 120, borderRadius: 8 }}
            />
            <View className='ml-4 flex-1 justify-center'>
              <Text
                variant='titleLarge'
                style={{ fontWeight: 'bold' }}
                numberOfLines={2}
              >
                {favoriteData?.pages[0].favoriteMeta.title}
              </Text>
              <Text
                variant='bodyMedium'
                numberOfLines={1}
              >
                {favoriteData?.pages[0].favoriteMeta.upper.name} •{' '}
                {favoriteData?.pages[0].favoriteMeta.media_count} 首歌曲
              </Text>
            </View>
          </View>

          {/* 描述和操作按钮 */}
          <View className='flex flex-row items-center justify-between p-4'>
            <Text
              variant='bodyMedium'
              numberOfLines={2}
            >
              {favoriteData?.pages[0].favoriteMeta.intro || '还没有简介哦~'}
            </Text>

            <IconButton
              mode='contained'
              icon='play'
              onPress={() => playAll()}
            />
          </View>

          <Divider />
        </View>
        <FlatList
          data={favoriteData?.pages.flatMap((page) => page.tracks)}
          renderItem={({ item, index }) => (
            <TrackItem
              item={item}
              index={index}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true)
                await refetch()
                setRefreshing(false)
              }}
              colors={[colors.primary]}
              progressViewOffset={50}
            />
          }
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onEndReached={hasNextPage ? () => fetchNextPage() : null}
          ListFooterComponent={
            hasNextPage ? (
              <View className='flex-row items-center justify-center p-4'>
                <ActivityIndicator size='small' />
              </View>
            ) : null
          }
        />
      </View>

      {/* 当前播放栏 */}
      <View className='absolute right-0 bottom-0 left-0'>
        <NowPlayingBar />
      </View>
    </View>
  )
}
