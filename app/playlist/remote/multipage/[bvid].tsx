import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetMultiPageList,
	useGetVideoDetails,
} from '@/hooks/queries/bilibili/useVideoData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { facade } from '@/lib/facades/facade'
import {
	BilibiliMultipageVideo,
	BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import { Track } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const mapApiItemToViewTrack = (
	mp: BilibiliMultipageVideo,
	video: BilibiliVideoDetails,
) => {
	return {
		id: mp.cid,
		cid: mp.cid,
		bvid: video.bvid,
		title: mp.part,
		artist: {
			id: video.owner.mid,
			name: video.owner.name,
			source: 'bilibili',
		},
		coverUrl: mp.first_frame,
		duration: mp.duration,
		source: 'bilibili',
		isMultiPage: true,
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

const mapApiItemToTrack = (
	mp: BilibiliMultipageVideo,
	video: BilibiliVideoDetails,
): Track => {
	return {
		id: video.aid,
		source: 'bilibili',
		title: mp.part,
		artist: {
			id: 1145141919810, // FIXME: Don't ask me why, bro.
			name: video.owner.name,
			signature: '你所热爱的，就是你的生活',
			remoteId: video.owner.mid.toString(),
			source: 'bilibili',
			avatarUrl: null,
			createdAt: video.pubdate,
		},
		coverUrl: video.pic,
		duration: mp.duration,
		playCountSequence: [],
		createdAt: video.pubdate,
		bilibiliMetadata: {
			bvid: video.bvid,
			cid: mp.cid,
			isMultiPage: true,
		},
	}
}

const playlistLog = log.extend('Playlist/Multipage')

export default function MultipagePage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistMultipage'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistMultipage'>>()
	const { bvid } = route.params
	const [refreshing, setRefreshing] = useState(false)
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const insets = useSafeAreaInsets()

	const {
		data: rawMultipageData,
		isPending: isMultipageDataPending,
		isError: isMultipageDataError,
		refetch,
	} = useGetMultiPageList(bvid)

	const {
		data: videoData,
		isError: isVideoDataError,
		isPending: isVideoDataPending,
	} = useGetVideoDetails(bvid)

	const tracksData = useMemo(() => {
		if (!rawMultipageData || !videoData) {
			return []
		}
		return rawMultipageData.map((item) =>
			mapApiItemToViewTrack(item, videoData),
		)
	}, [rawMultipageData, videoData])

	const playTrack = useCallback(
		(track: UITrack, playNext = false) => {
			if (!rawMultipageData || !videoData) return
			const apiItem = rawMultipageData.find((item) => item.cid === track.cid)
			if (!apiItem) return
			const trackToPlay = mapApiItemToTrack(apiItem, videoData)
			addToQueue({
				tracks: [trackToPlay],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue, rawMultipageData, videoData],
	)

	const trackMenuItems = useCallback(
		(item: UITrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playTrack(item, true),
			},
		],
		[playTrack],
	)

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => playTrack(item)}
					menuItems={trackMenuItems(item)}
					showCoverImage={false}
					data={{
						cover: item.coverUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
				/>
			)
		},
		[playTrack, trackMenuItems],
	)

	const handleSync = useCallback(async () => {
		const result = await facade.syncMultiPageVideo(bvid)
		if (result.isErr()) {
			toast.error(flatErrorMessage(result.error))
			playlistLog.error(result.error)
			return
		}
		toast.success('同步成功')
		navigation.replace('PlaylistLocal', { id: String(result.value) })
	}, [bvid, navigation])

	const keyExtractor = useCallback((item: UITrack) => {
		return String(item.id)
	}, [])

	useEffect(() => {
		if (typeof bvid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [bvid, navigation])

	if (typeof bvid !== 'string') {
		return null
	}

	if (isMultipageDataPending || isVideoDataPending) {
		return <PlaylistLoading />
	}

	if (isMultipageDataError || isVideoDataError) {
		return <PlaylistError text='加载失败' />
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<PlaylistAppBar />

			<View
				style={{
					flex: 1,
				}}
			>
				<LegendList
					data={tracksData}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={videoData.pic}
							title={videoData.title}
							subtitles={`${videoData.owner.name} • ${tracksData.length} 首歌曲`}
							description={videoData.desc}
							onClickMainButton={handleSync}
							mainButtonIcon={'sync'}
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
							style={{
								textAlign: 'center',
								paddingTop: 10,
							}}
						>
							•
						</Text>
					}
				/>
			</View>
		</View>
	)
}
