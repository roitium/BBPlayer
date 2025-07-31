import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useCollectionAllContents } from '@/hooks/queries/bilibili/useFavoriteData'
import { bv2av } from '@/lib/api/bilibili/utils'
import { BilibiliMediaItemInCollection } from '@/types/apis/bilibili'
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

const playlistLog = log.extend('PLAYLIST/COLLECTION')

const mapApiItemToViewTrack = (apiItem: BilibiliMediaItemInCollection) => {
	return {
		id: bv2av(apiItem.bvid),
		cid: apiItem.id,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.id,
			name: apiItem.upper.name,
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		source: 'bilibili', // 明确来源
		isMultiPage: false, // 合集里的视频不当作分P处理
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

export default function CollectionPage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistCollection'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistCollection'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	// const [modalVisible, setModalVisible] = useState(false)
	// const [currentModalBvid, setCurrentModalBvid] = useState('')

	const {
		data: collectionData,
		isPending: isCollectionDataPending,
		isError: isCollectionDataError,
		refetch,
	} = useCollectionAllContents(Number(id))
	const tracksForDisplay = useMemo(
		() => collectionData?.medias.map(mapApiItemToViewTrack) ?? [],
		[collectionData],
	)

	const _playNext = useCallback(
		async (track: BilibiliMediaItemInCollection) => {
			try {
				toast.info('暂未实现: ' + track.id)
				// await addToQueue({
				// 	tracks: [track],
				// 	playNow: false,
				// 	clearQueue: false,
				// 	playNext: true,
				// })
				// toast.success('添加到下一首播放成功')
			} catch (error) {
				playlistLog.sentry('添加到队列失败', error)
				toast.error('添加到队列失败')
			}
		},
		[],
	)

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
					// setCurrentModalBvid(item.bvid)
					// setModalVisible(true)
				},
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: () => {
					// navigation.navigate('PlaylistMultipage', { bvid: item.bvid })
					toast.show('暂未实现')
				},
			},
		],
		[],
	)

	const handleTrackPress = useCallback(() => {
		// playAll(id)
		toast.show('暂未实现')
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={handleTrackPress}
					menuItems={trackMenuItems(item)}
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
		[handleTrackPress, trackMenuItems],
	)

	const keyExtractor = useCallback((item: UITrack) => item.bvid, [])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isCollectionDataPending) {
		return <PlaylistLoading />
	}

	if (isCollectionDataError) {
		return (
			<PlaylistError
				text='加载收藏夹内容失败'
				onRetry={refetch}
			/>
		)
	}

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<PlaylistAppBar />

			<View
				style={{
					flex: 1,
				}}
			>
				<LegendList
					data={tracksForDisplay}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						paddingTop: 0,
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={collectionData.info.cover}
							title={collectionData.info.title}
							subtitle={`${collectionData.info.upper.name} • ${collectionData.info.media_count} 首歌曲`}
							description={collectionData.info.intro}
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
						/>
					}
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
