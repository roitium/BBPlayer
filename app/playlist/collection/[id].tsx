import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import {
  ActivityIndicator,
  Appbar,
  Button,
  Text,
  useTheme,
} from 'react-native-paper'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import NowPlayingBar from '@/components/NowPlayingBar'
import { useCollectionAllContents } from '@/hooks/queries/useFavoriteData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import Toast from '@/utils/toast'
import { TrackListItem } from '@/components/playlist/PlaylistItem'

const playlistLog = log.extend('PLAYLIST/COLLECTION')

export default function CollectionPage() {
  const { id } = useLocalSearchParams()
  const { colors } = useTheme()
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)

  const {
    data: collectionData,
    isPending: isCollectionDataPending,
    isError: isCollectionDataError,
    refetch,
  } = useCollectionAllContents(bilibiliApi, Number(id))

  const playAll = useCallback(
    async (startFromId?: string) => {
      try {
        if (!collectionData?.medias) {
          Toast.error('播放全部失败', {
            description: '无法加载收藏夹内容',
          })
          playlistLog.error(
            '播放全部失败 - collectionData.medias 为空',
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
        Toast.error('播放全部失败', { description: '发生未知错误' })
      }
    },
    [addToQueue, collectionData],
  )

  const playNext = useCallback(
    async (track: Track) => {
      try {
        await addToQueue({
          tracks: [track],
          playNow: false,
          clearQueue: false,
          playNext: true,
        })
        Toast.success(`已添加 ${track.title} 到下一首播放`)
      } catch (error) {
        playlistLog.sentry('添加到队列失败', error)
        Toast.error('添加到队列失败')
      }
    },
    [addToQueue],
  )

  const trackMenuItems = useCallback(
    () => [
      {
        title: '下一首播放',
        leadingIcon: 'play-circle-outline',
        onPress: playNext,
      },
    ],
    [playNext],
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
          menuItems={trackMenuItems()}
        />
      )
    },
    [handleTrackPress, trackMenuItems],
  )

  const keyExtractor = useCallback((item: Track) => item.id, [])

  if (typeof id !== 'string') {
    // @ts-expect-error
    router.replace('/not-found')
    return null
  }

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

  if (isCollectionDataError || !collectionData) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Text
          variant='titleMedium'
          style={{ textAlign: 'center', marginBottom: 16 }}
        >
          加载收藏夹内容失败
        </Text>
        <Button
          onPress={() => refetch()}
          mode='contained'
        >
          重试
        </Button>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* App Bar */}
      <Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 10 }}>
        <Appbar.BackAction onPress={() => router.back()} />
      </Appbar.Header>

      {/* Background Image */}
      {/* 顶部背景图 */}
      <View style={{ position: 'absolute', height: '100%', width: '100%' }}>
        <Image
          source={{ uri: collectionData?.info.cover }}
          style={{
            width: '100%',
            height: '100%',
            opacity: 0.15,
          }}
          blurRadius={15}
        />
      </View>

      {/* Content Area */}
      <View style={{ flex: 1, paddingBottom: currentTrack ? 80 : 0 }}>
        <FlatList
          data={collectionData.medias}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 0 }}
          ListHeaderComponent={
            <PlaylistHeader
              coverUri={collectionData.info.cover}
              title={collectionData.info.title}
              subtitle={`${collectionData.info.upper.name} • ${collectionData.info.media_count} 首歌曲`}
              description={collectionData.info.intro}
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
            />
          }
          ListFooterComponent={
            <Text
              variant='titleMedium'
              style={{ textAlign: 'center', paddingTop: 10 }}
            >
              •
            </Text>
          }
        />
      </View>

      {/* Now Playing Bar */}
      <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0 }}>
        <NowPlayingBar />
      </View>
    </View>
  )
}
