import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import NowPlayingBar from '@/components/NowPlayingBar'
import {
  useBatchDeleteFavoriteListContents,
  useInfiniteFavoriteList,
} from '@/hooks/queries/useFavoriteData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import Toast from '@/utils/toast'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'

const playlistLog = log.extend('PLAYLIST/FAVORITE')

export default function FavoritePage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
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

  const trackMenuItems = useCallback(
    (item: Track) => [
      {
        title: '下一首播放',
        leadingIcon: 'play-circle-outline',
        onPress: playNext,
      },
      {
        title: '从收藏夹中删除',
        leadingIcon: 'playlist-remove',
        onPress: async () => {
          mutate({ bvids: [item.id], favoriteId: Number(id) })
          setRefreshing(true)
          await refetch()
          setRefreshing(false)
        },
      },
    ],
    [playNext, mutate, refetch, id],
  )

  const handleTrackPress = useCallback(
    (track: Track) => {
      playAll(track.id)
    },
    [playAll],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => {
      return (
        <TrackListItem
          item={item}
          index={index}
          onTrackPress={handleTrackPress}
          menuItems={trackMenuItems(item)}
        />
      )
    },
    [handleTrackPress, trackMenuItems],
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
            <PlaylistHeader
              coverUri={favoriteData?.pages[0].favoriteMeta.cover}
              title={favoriteData?.pages[0].favoriteMeta.title}
              subtitle={`${favoriteData?.pages[0].favoriteMeta.upper.name} • ${favoriteData?.pages[0].favoriteMeta.media_count} 首歌曲`}
              description={favoriteData?.pages[0].favoriteMeta.intro}
              onPlayAll={() => playAll()}
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
