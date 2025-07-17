import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useCollectionAllContents } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/COLLECTION')

export default function CollectionPage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistCollection'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistCollection'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

	const {
		data: collectionData,
		isPending: isCollectionDataPending,
		isError: isCollectionDataError,
		refetch,
	} = useCollectionAllContents(Number(id))

	const playAll = useCallback(
		async (startFromId?: string) => {
			try {
				if (!collectionData?.medias) {
					toast.error('播放全部失败', {
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
					startFromId: startFromId,
					playNext: false,
				})
			} catch (error) {
				playlistLog.sentry('播放全部失败', error)
				toast.error('播放全部失败', { description: '发生未知错误' })
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
				toast.success('添加到下一首播放成功')
			} catch (error) {
				playlistLog.sentry('添加到队列失败', error)
				toast.error('添加到队列失败')
			}
		},
		[addToQueue],
	)

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playNext(item),
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
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
				},
			},
		],
		[playNext, navigation],
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
					data={collectionData.medias}
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

			<AddToFavoriteListsModal
				key={currentModalBvid}
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>
		</View>
	)
}
