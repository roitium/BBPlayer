import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { router } from 'expo-router'
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useState,
} from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import {
  ActivityIndicator,
  Appbar,
  Button,
  Divider,
  IconButton,
  Menu,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import NowPlayingBar from '@/components/NowPlayingBar'
import { useCollectionAllContents } from '@/hooks/queries/useFavoriteData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'
import Toast from '@/utils/toast'

const playlistLog = log.extend('PLAYLIST/COLLECTION')

export default function CollectionPage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)

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
          Toast.error('播放全部失败', {
            description: '未知错误，collectionData.medias 为空',
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

  // @ts-expect-error
  if (typeof id !== 'string') return router.replace('/not-found')

  if (isCollectionDataPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isCollectionDataError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant='titleMedium'
          style={{ textAlign: 'center' }}
        >
          加载失败
        </Text>
        <Button
          onPress={() => refetch()}
          style={{ marginTop: 16 }}
        >
          重试
        </Button>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 500 }}>
        <Appbar.BackAction
          onPress={() => {
            router.back()
          }}
        />
      </Appbar.Header>

      <View style={{ position: 'absolute', height: '100%', width: '100%' }}>
        <Image
          source={{ uri: collectionData.info.cover }}
          style={{
            width: '100%',
            height: '100%',
            opacity: 0.15,
          }}
          blurRadius={15}
        />
      </View>

      <View style={{ flex: 1, paddingBottom: currentTrack ? 80 : 0 }}>
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

      <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0 }}>
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
  playAll: (startFromId?: string) => Promise<void>
}) {
  if (!collectionData) return null
  return (
    <>
      <View
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', padding: 16 }}>
          <Image
            source={{ uri: collectionData.info.cover }}
            style={{ width: 120, height: 120, borderRadius: 8 }}
          />
          <View style={{ marginLeft: 16, flex: 1, justifyContent: 'center' }}>
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
              style={{ marginTop: 4 }}
            >
              {collectionData.info.upper.name} •{' '}
              {collectionData.info.media_count} 首歌曲
            </Text>
          </View>
        </View>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}
        >
          <Text
            variant='bodyMedium'
            style={{ maxWidth: '75%' }}
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
        style={{
          overflow: 'hidden',
          borderRadius: 8,
          backgroundColor: 'transparent',
        }}
        elevation={0}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
        >
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
            style={{ width: 48, height: 48, borderRadius: 4, marginLeft: 8 }}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 2,
              }}
            >
              <Text
                variant='bodySmall'
                numberOfLines={1}
              >
                {item.artist}
              </Text>
              <Text
                style={{ marginHorizontal: 4 }}
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
