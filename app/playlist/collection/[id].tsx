import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import {
	ActivityIndicator,
	Appbar,
	Button,
	Text,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import NowPlayingBar from '@/components/NowPlayingBar'
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
					startFromKey: startFromId,
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
		return
	}

	if (isCollectionDataPending) {
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

	if (isCollectionDataError || !collectionData) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					padding: 16,
					backgroundColor: colors.background,
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
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			{/* App Bar */}
			<Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 10 }}>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
			</Appbar.Header>

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
			<View
				style={{
					flex: 1,
					paddingBottom: currentTrack ? 80 + insets.bottom : insets.bottom,
				}}
			>
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

			<AddToFavoriteListsModal
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>

			{/* Now Playing Bar */}
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
