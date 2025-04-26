import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
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
  useBatchDeleteFavoriteListContents,
  useInfiniteFavoriteList,
} from '@/hooks/queries/useFavoriteData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'
import Toast from '@/utils/toast'

const playlistLog = log.extend('PLAYLIST/FAVORITE')

export default function FavoritePage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)
  const { mutate } = useBatchDeleteFavoriteListContents(bilibiliApi)

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

  // 播放全部
  const playAll = useCallback(
    async (startFromId?: string) => {
      try {
        const allContentIds = await bilibiliApi.getFavoriteListAllContents(
          Number(id),
        )
        if (allContentIds.isErr()) {
          playlistLog.sentry('获取所有内容失败', allContentIds.error)
          Toast.error('播放全部失败', {
            description: '获取收藏夹所有内容失败，无法播放',
          })
          return
        }
        const allTracks: Track[] = allContentIds.value.map((c) => ({
          id: c.bvid,
          source: 'bilibili' as const,
          hasMetadata: false,
          isMultiPage: false,
        }))
        await addToQueue({
          tracks: allTracks,
          playNow: true,
          clearQueue: true,
          startFromId,
          playNext: false,
        })
      } catch (error) {
        playlistLog.sentry('播放全部失败', error)
      }
    },
    [addToQueue, bilibiliApi.getFavoriteListAllContents, id],
  )

  // 获取收藏夹数据
  const {
    data: favoriteData,
    isPending: isFavoriteDataPending,
    isError: isFavoriteDataError,
    fetchNextPage,
    refetch,
    hasNextPage,
  } = useInfiniteFavoriteList(bilibiliApi, Number(id))

  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => {
      return (
        <TrackItem
          item={item}
          index={index}
          playAll={playAll}
          menuVisible={menuVisible}
          setMenuVisible={setMenuVisible}
          setRefreshing={setRefreshing}
          refetch={refetch}
          playNext={playNext}
          mutate={mutate}
          favoriteId={id as string}
        />
      )
    },
    [id, menuVisible, refetch, playAll, playNext, mutate],
  )

  const keyExtractor = useCallback((item: Track) => item.id, [])

  // @ts-expect-error
  if (typeof id !== 'string') return router.replace('/not-found')

  if (isFavoriteDataPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isFavoriteDataError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          variant='titleMedium'
          style={{ textAlign: 'center' }}
        >
          加载失败
        </Text>
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

      {/* 顶部背景图 */}
      <View style={{ position: 'absolute', height: '100%', width: '100%' }}>
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

      <View style={{ flex: 1, paddingBottom: currentTrack ? 80 : 0 }}>
        <FlatList
          data={favoriteData?.pages.flatMap((page) => page.tracks)}
          renderItem={renderItem}
          ListHeaderComponent={
            <Header
              favoriteData={favoriteData}
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
          onEndReached={hasNextPage ? () => fetchNextPage() : null}
          ListFooterComponent={
            hasNextPage ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                }}
              >
                <ActivityIndicator size='small' />
              </View>
            ) : null
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
  favoriteData,
  playAll,
}: {
  favoriteData: ReturnType<typeof useInfiniteFavoriteList>['data']
  playAll: () => Promise<void>
}) {
  if (!favoriteData) return null
  return (
    <View style={{ position: 'relative', flexDirection: 'column' }}>
      {/* 收藏夹信息 */}
      <View style={{ flexDirection: 'row', padding: 16 }}>
        <Image
          source={{ uri: favoriteData?.pages[0].favoriteMeta.cover }}
          style={{ width: 120, height: 120, borderRadius: 8 }}
        />
        <View style={{ marginLeft: 16, flex: 1, justifyContent: 'center' }}>
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <Text
          variant='bodyMedium'
          style={{ maxWidth: 300 }}
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
  )
})

const TrackItem = memo(function TrackItem({
  item,
  index,
  menuVisible,
  setMenuVisible,
  setRefreshing,
  refetch,
  playAll,
  mutate,
  playNext,
  favoriteId,
}: {
  item: Track
  index: number
  playAll: (startFromId?: string) => Promise<void>
  menuVisible: string | null
  setMenuVisible: Dispatch<SetStateAction<string | null>>
  setRefreshing: Dispatch<SetStateAction<boolean>>
  refetch: ReturnType<typeof useInfiniteFavoriteList>['refetch']
  playNext: (track: Track) => Promise<void>
  mutate: ReturnType<typeof useBatchDeleteFavoriteListContents>['mutate']
  favoriteId: string
}) {
  return (
    <TouchableRipple
      key={item.id}
      style={{ paddingVertical: 5 }}
      onPress={() => playAll(item.id)}
    >
      <Surface
        style={{ overflow: 'hidden', borderRadius: 8 }}
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
            style={{ width: 48, height: 48, borderRadius: 4 }}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text variant='titleMedium'>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant='bodySmall'>{item.artist}</Text>
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
            <Menu.Item
              leadingIcon='playlist-remove'
              onPress={async () => {
                mutate({ bvids: [item.id], favoriteId: Number(favoriteId) })
                setMenuVisible(null)
                setRefreshing(true)
                await refetch()
                setRefreshing(false)
              }}
              title='从收藏夹中删除'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableRipple>
  )
})
