import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useBatchDeleteFavoriteListContents,
	useInfiniteFavoriteList,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
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
import {
	ActivityIndicator,
	Appbar,
	Divider,
	Text,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/FAVORITE')

export default function FavoritePage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistFavorite'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistFavorite'>
		>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const { mutate } = useBatchDeleteFavoriteListContents()
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

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
				toast.success('添加到下一首播放成功')
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
					toast.error('播放全部失败', {
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
					startFromKey: startFromId,
					playNext: false,
				})
			} catch (error) {
				playlistLog.sentry('播放全部失败', error)
			}
		},
		[addToQueue, id],
	)

	// 获取收藏夹数据
	const {
		data: favoriteData,
		isPending: isFavoriteDataPending,
		isError: isFavoriteDataError,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteFavoriteList(Number(id))

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: playNext,
			},
			TrackMenuItemDividerToken,
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
		[playNext, mutate, refetch, id, navigation],
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

	if (isFavoriteDataPending) {
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

	if (isFavoriteDataError) {
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
					source={{ uri: favoriteData?.pages[0].favoriteMeta.cover }}
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
					// paddingBottom: currentTrack ? 80 + insets.bottom : insets.bottom,
				}}
			>
				<LegendList
					data={favoriteData?.pages.flatMap((page) => page.tracks)}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
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
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
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
						) : (
							<Text
								variant='titleMedium'
								style={{
									textAlign: 'center',
									paddingTop: 10,
								}}
							>
								•
							</Text>
						)
					}
				/>
			</View>

			<AddToFavoriteListsModal
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>
		</View>
	)
}
