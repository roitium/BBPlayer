import { useLocalSearchParams } from 'expo-router'
import { View, Image as RNImage, FlatList, RefreshControl } from 'react-native'
import {
  ActivityIndicator,
  Appbar,
  Divider,
  IconButton,
  Menu,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { router } from 'expo-router'
import Image from '@d11/react-native-fast-image'

import log from '@/utils/log'
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useState,
} from 'react'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import type { Track } from '@/types/core/media'
import { showToast } from '@/utils/toast'
import { useCollectionAllContents } from '@/hooks/queries/useFavoriteData'
import NowPlayingBar from '@/components/NowPlayingBar'
import { formatDurationToHHMMSS } from '@/utils/times'

const playlistLog = log.extend('PLAYLIST/COLLECTION')

export default function CollectionPage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)

  // @ts-ignore 故意定向到一个不存在的页面，触发 404
  if (typeof id !== 'string') return router.replace('/not-found')

  // 下一首播放
  const playNext = useCallback(
    async (track: Track) => {
      try {
        await addToQueue({
          tracks: [track],
          playNow: false,
          clearQueue: false,
          playNext: true,
        })
      } catch (error) {
        playlistLog.sentry('添加到队列失败', error)
      }
    },
    [addToQueue],
  )

  // 获取收藏夹数据
  const {
    data: collectionData,
    isPending: isCollectionDataPending,
    isError: isCollectionDataError,
    refetch,
  } = useCollectionAllContents(bilibiliApi, Number(id))

  // 播放全部
  const playAll = useCallback(
    async (startFromId?: string) => {
      try {
        if (!collectionData) {
          showToast({
            severity: 'error',
            title: '未知错误，collectionData.medias 为空',
          })
          playlistLog.error(
            '未知错误，collectionData.medias 为空',
            collectionData,
          )
          return
        }
        await addToQueue({
          tracks: collectionData.medias,
          playNow: true,
          clearQueue: true,
          startFromId,
          playNext: false,
        })
      } catch (error) {
        playlistLog.sentry('播放全部失败', error)
      }
    },
    [addToQueue, collectionData],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => {
      return (
        <TrackItem
          item={item}
          index={index}
          playAll={playAll}
          menuVisible={menuVisible}
          setMenuVisible={setMenuVisible}
          playNext={playNext}
        />
      )
    },
    [menuVisible, playAll, playNext],
  )

  const keyExtractor = useCallback((item: Track) => item.id, [])

  if (isCollectionDataPending) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isCollectionDataError) {
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
        {/* TODO: 如何在 react-native-fast-image 中实现模糊效果 */}
        <RNImage
          source={{ uri: collectionData.info.cover }}
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
        <FlatList
          data={collectionData.medias}
          renderItem={renderItem}
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
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Header
              collectionData={collectionData}
              playAll={playAll}
            />
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

const Header = memo(function Header({
  collectionData,
  playAll,
}: {
  collectionData: ReturnType<typeof useCollectionAllContents>['data']
  playAll: () => Promise<void>
}) {
  if (!collectionData) return null
  return (
    <>
      {/* 顶部收藏夹信息 */}
      <View className='relative flex flex-col'>
        {/* 收藏夹信息 */}
        <View className='flex flex-row p-4'>
          <Image
            source={{ uri: collectionData.info.cover }}
            style={{ width: 120, height: 120, borderRadius: 8 }}
          />
          <View className='ml-4 flex-1 justify-center'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
              numberOfLines={2}
            >
              {collectionData.info.title}
            </Text>
            <Text
              variant='bodyMedium'
              numberOfLines={1}
            >
              {collectionData.info.upper.name} •{' '}
              {collectionData.info.media_count} 首歌曲
            </Text>
          </View>
        </View>

        {/* 描述和操作按钮 */}
        <View className='flex flex-row items-center justify-between p-4'>
          <Text
            variant='bodyMedium'
            style={{ maxWidth: 300 }}
          >
            {collectionData.info.intro || '还没有简介哦~'}
          </Text>

          <IconButton
            mode='contained'
            icon='play'
            size={25}
            onPress={() => playAll()}
          />
        </View>

        <Divider />
      </View>
    </>
  )
})

const TrackItem = memo(function TrackItem({
  item,
  index,
  menuVisible,
  setMenuVisible,
  playAll,
  playNext,
}: {
  item: Track
  index: number
  playAll: (startFromId?: string) => Promise<void>
  menuVisible: string | null
  setMenuVisible: Dispatch<SetStateAction<string | null>>
  playNext: (track: Track) => Promise<void>
}) {
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
            style={{ width: 48, height: 48, borderRadius: 4 }}
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
          </Menu>
        </View>
      </Surface>
    </TouchableRipple>
  )
})
