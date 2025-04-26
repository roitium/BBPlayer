import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
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
import Toast from '@/utils/toast'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'

const playlistLog = log.extend('PLAYLIST/MULTIPAGE')

export default function MultipagePage() {
  const { bvid } = useLocalSearchParams()
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const [refreshing, setRefreshing] = useState(false)
  const colors = useTheme().colors
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const [tracksData, setTracksData] = useState<Track[]>([])
  const addToQueue = usePlayerStore((state) => state.addToQueue)

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
          Toast.error('播放全部失败', {
            description: '未知错误，tracksData 为空',
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
      playAll(track.cid)
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

  // 这里使用 cid
  const keyExtractor = useCallback((item: Track) => {
    return item.cid ? item.cid.toString() : ''
  }, [])

  // biome-ignore-start lint/correctness/useHookAtTopLevel: 懒得改了

  if (isMultipageDataPending || isVideoDataPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  if (isMultipageDataError || isVideoDataError) {
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
          source={{ uri: videoData.pic }}
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
          data={tracksData}
          renderItem={renderItem}
          ListHeaderComponent={
            <PlaylistHeader
              coverUri={videoData.pic}
              title={videoData.title}
              subtitle={`${videoData.owner.name} • ${multipageData.length} 首歌曲`}
              description={videoData.desc}
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

      {/* 当前播放栏 */}
      <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0 }}>
        <NowPlayingBar />
      </View>
    </View>
  )
}
