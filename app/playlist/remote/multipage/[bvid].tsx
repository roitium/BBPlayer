import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetMultiPageList,
	useGetVideoDetails,
} from '@/hooks/queries/bilibili/useVideoData'
import {
	BilibiliMultipageVideo,
	BilibiliVideoDetails,
} from '@/types/apis/bilibili'
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
		id: String(mp.cid), // 仅仅用于列表的 key，不会作为真实 id 传递
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
		source: 'bilibili', // 明确来源
		isMultiPage: true,
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

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
	// const addToQueue = usePlayerStore((state) => state.addToQueue)
	const insets = useSafeAreaInsets()
	// const [modalVisible, setModalVisible] = useState(false)
	// const [currentModalBvid, setCurrentModalBvid] = useState('')

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
		// const multipageData = rawMultipageData.map((item) => ({
		// 	...item,
		// 	first_frame: videoData?.pic || '',
		// }))
		// return transformMultipageVideosToTracks(multipageData, videoData)
		return rawMultipageData.map((item) =>
			mapApiItemToViewTrack(item, videoData),
		)
	}, [rawMultipageData, videoData])

	// const playNext = useCallback(
	// 	async (track: Track) => {
	// 		try {
	// 			await addToQueue({
	// 				tracks: [track],
	// 				playNow: false,
	// 				clearQueue: false,
	// 				playNext: true,
	// 			})
	// 			toast.success('添加到下一首播放成功')
	// 		} catch (error) {
	// 			playlistLog.sentry('添加到队列失败', error)
	// 		}
	// 	},
	// 	[addToQueue],
	// )

	// const playAll = useCallback(
	// 	async (startFromCid?: number) => {
	// 		try {
	// 			if (!tracksData || tracksData.length === 0) {
	// 				toast.error('播放全部失败', {
	// 					description: '未知错误，tracksData 为空',
	// 				})
	// 				playlistLog.error('未知错误，tracksData 为空', tracksData)
	// 				return
	// 			}
	// 			playlistLog.debug('开始播放全部', { startFromCid })
	// 			await addToQueue({
	// 				tracks: tracksData,
	// 				playNow: true,
	// 				clearQueue: true,
	// 				startFromId: startFromCid ? `${bvid}-${startFromCid}` : undefined,
	// 				playNext: false,
	// 			})
	// 		} catch (error) {
	// 			playlistLog.sentry('播放全部失败', error)
	// 		}
	// 	},
	// 	[addToQueue, tracksData, bvid],
	// )

	const trackMenuItems = useCallback(
		(_item: UITrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => toast.show('暂未实现'),
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					toast.show('暂未实现')
				},
			},
		],
		[],
	)

	const handleTrackPress = useCallback(() => {
		toast.show('暂未实现')
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={handleTrackPress}
					menuItems={trackMenuItems(item)}
					showCoverImage={false}
				/>
			)
		},
		[handleTrackPress, trackMenuItems],
	)

	const keyExtractor = useCallback((item: UITrack) => {
		return item.id
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
							subtitle={`${videoData.owner.name} • ${tracksData.length} 首歌曲`}
							description={videoData.desc}
							onPlayAll={() => toast.show('暂未实现')}
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

			{/* <AddToFavoriteListsModal
				key={currentModalBvid}
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/> */}
		</View>
	)
}
