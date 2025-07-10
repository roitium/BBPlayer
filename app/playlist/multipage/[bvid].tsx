import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import NowPlayingBar from '@/components/NowPlayingBar'
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
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { transformMultipageVideosToTracks } from '@/lib/api/bilibili/bilibili.transformers'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import toast from '@/utils/toast'
import type { RootStackParamList } from '../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/MULTIPAGE')

export default function MultipagePage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistMultipage'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistMultipage'>>()
	const { bvid } = route.params
	const [refreshing, setRefreshing] = useState(false)
	const colors = useTheme().colors
	const currentTrack = useCurrentTrack()
	const [tracksData, setTracksData] = useState<Track[]>([])
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

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

	const multipageData = rawMultipageData?.map((item) => ({
		...item,
		first_frame: videoData?.pic || '',
	}))

	// 其他 Hooks
	const playNext = useCallback(
		async (track: Track) => {
			try {
				await addToQueue({
					tracks: [track],
					playNow: false,
					clearQueue: false,
					playNext: true,
				})
				toast.success('添加到下一首播放成功')
			} catch (error) {
				playlistLog.sentry('添加到队列失败', error)
			}
		},
		[addToQueue],
	)

	const playAll = useCallback(
		async (startFromCid?: number) => {
			try {
				if (!tracksData || tracksData.length === 0) {
					toast.error('播放全部失败', {
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
					startFromKey: startFromCid ? `${bvid}-${startFromCid}` : undefined,
					playNext: false,
				})
			} catch (error) {
				playlistLog.sentry('播放全部失败', error)
			}
		},
		[addToQueue, tracksData, bvid],
	)

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: playNext,
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					setCurrentModalBvid(item.id)
					setModalVisible(true)
				},
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
					menuItems={trackMenuItems(item)}
					showCoverImage={false}
				/>
			)
		},
		[handleTrackPress, trackMenuItems],
	)

	const keyExtractor = useCallback((item: Track) => {
		return item.cid ? item.cid.toString() : ''
	}, [])

	useEffect(() => {
		if (multipageData && videoData) {
			setTracksData(transformMultipageVideosToTracks(multipageData, videoData))
		}
		// multipageData 是基于 rawMultipageData 的派生数据，因此不应该在依赖中添加 multipageData
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rawMultipageData, videoData])

	useEffect(() => {
		if (typeof bvid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [bvid, navigation])

	if (typeof bvid !== 'string') {
		return
	}

	if (isMultipageDataPending || isVideoDataPending) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
				<ActivityIndicator size='large' />
			</View>
		)
	}

	if (isMultipageDataError || isVideoDataError) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
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
						navigation.goBack()
					}}
				/>
			</Appbar.Header>

			{/* 顶部背景图 */}
			{/* <View style={{ position: 'absolute', height: '100%', width: '100%' }}>
				<Image
					source={{ uri: videoData.pic }}
					style={{
						width: '100%',
						height: '100%',
						opacity: 0.15,
					}}
					blurRadius={15}
				/>
			</View> */}

			<View
				style={{
					flex: 1,
				}}
			>
				<FlatList
					data={tracksData}
					renderItem={renderItem}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={videoData.pic}
							title={videoData.title}
							subtitle={`${videoData.owner.name} • ${(multipageData ?? []).length} 首歌曲`}
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
							style={{
								textAlign: 'center',
								paddingTop: 10,
								paddingBottom: currentTrack
									? 70 + insets.bottom
									: insets.bottom,
							}}
						>
							•
						</Text>
					}
				/>
			</View>

			<AddToFavoriteListsModal
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>

			{/* 当前播放栏 */}
			<View
				style={{
					position: 'absolute',
					right: 0,
					bottom: insets.bottom,
					left: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
