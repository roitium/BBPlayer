import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
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
import NowPlayingBar from '@/components/NowPlayingBar'
import {
  useGetMultiPageList,
  useGetVideoDetails,
} from '@/hooks/queries/useVideoData'
import { transformMultipageVideosToTracks } from '@/lib/api/bilibili/bilibili'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'
import { showToast } from '@/utils/toast'

const playlistLog = log.extend('PLAYLIST/MULTIPAGE')

export default function MultipagePage() {
  const { bvid } = useLocalSearchParams()
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)
  const colors = useTheme().colors
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const [tracksData, setTracksData] = useState<Track[]>([])
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const [menuVisible, setMenuVisible] = useState<number | null>(null)

  // @ts-ignore 故意定向到一个不存在的页面，触发 404
  if (typeof bvid !== 'string') return router.replace('/not-found')

  // biome-ignore-start lint/correctness/useHookAtTopLevel: 懒得改了
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

  const {
    data: multipageData,
    isPending: isMultipageDataPending,
    isError: isMultipageDataError,
    refetch,
  } = useGetMultiPageList(bvid, bilibiliApi)

  const {
    data: videoData,
    isError: isVideoDataError,
    isPending: isVideoDataPending,
  } = useGetVideoDetails(bvid, bilibiliApi)

  useEffect(() => {
    if (multipageData && videoData) {
      setTracksData(transformMultipageVideosToTracks(multipageData, videoData))
    }
  }, [multipageData, videoData])

  // 播放全部
  const playAll = useCallback(
    async (startFromCid?: number) => {
      try {
        if (!tracksData || tracksData.length === 0) {
          showToast({
            severity: 'error',
            title: '未知错误，tracksData 为空',
          })
          playlistLog.error('未知错误，tracksData 为空', tracksData)
          return
        }
        playlistLog.debug('开始播放全部', { startFromCid })
        await addToQueue({
          tracks: tracksData,
          playNow: true,
          clearQueue: true,
          startFromCid,
          playNext: false,
        })
      } catch (error) {
        playlistLog.sentry('播放全部失败', error)
      }
    },
    [addToQueue, tracksData],
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
    [menuVisible, playNext, playAll],
  )

  // 这里使用 cid
  const keyExtractor = useCallback((item: Track) => {
    return item.cid ? item.cid.toString() : ''
  }, [])

  // biome-ignore-start lint/correctness/useHookAtTopLevel: 懒得改了

  if (isMultipageDataPending || isVideoDataPending) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isMultipageDataError || isVideoDataError) {
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
          source={{ uri: videoData.pic }}
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
          data={tracksData}
          renderItem={renderItem}
          ListHeaderComponent={
            <Header
              videoData={videoData}
              pn={multipageData?.length}
              playAll={playAll}
            />
          }
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
  videoData,
  pn,
  playAll,
}: {
  videoData: ReturnType<typeof useGetVideoDetails>['data']
  pn: number // 总分 p 视频数量
  playAll: () => Promise<void>
}) {
  if (!videoData) return null
  return (
    <View className='relative flex flex-col'>
      {/* 收藏夹信息 */}
      <View className='flex flex-row p-4'>
        <Image
          source={{ uri: videoData.pic }}
          style={{ width: 120, height: 120, borderRadius: 8 }}
        />
        <View className='ml-4 flex-1 justify-center'>
          <Text
            variant='titleLarge'
            style={{ fontWeight: 'bold' }}
            numberOfLines={2}
          >
            {videoData.title}
          </Text>
          <Text
            variant='bodyMedium'
            numberOfLines={1}
          >
            {videoData.owner.name} • {pn} 首歌曲
          </Text>
        </View>
      </View>

      {/* 描述和操作按钮 */}
      <View className='flex flex-row items-center justify-between p-4'>
        <Text
          variant='bodyMedium'
          style={{ maxWidth: 300 }}
        >
          {videoData.desc || '还没有简介哦~'}
        </Text>

        <IconButton
          mode='contained'
          icon='play'
          onPress={() => playAll()}
        />
      </View>

      <Divider />
    </View>
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
  playAll: (startFromCid?: number) => Promise<void>
  menuVisible: number | null
  setMenuVisible: Dispatch<SetStateAction<number | null>>
  playNext: (track: Track) => Promise<void>
}) {
  return (
    <TouchableRipple
      style={{ paddingVertical: 5 }}
      onPress={() => playAll(item.cid)}
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
              <Text variant='bodySmall'>
                {item.duration ? formatDurationToHHMMSS(item.duration) : ''}
              </Text>
            </View>
          </View>
          <Menu
            visible={item.cid ? menuVisible === item.cid : false}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon='dots-vertical'
                size={24}
                onPress={() => item.cid && setMenuVisible(item.cid)}
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
