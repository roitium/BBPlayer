import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import NowPlayingBar from '@/components/NowPlayingBar'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { MULTIPAGE_VIDEO_KEYWORDS } from '@/constants/search'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetFavoritePlaylists,
	useInfiniteSearchFavoriteItems,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import type { RootStackParamList } from '../../../types/navigation'
import log from '@/utils/log'
import Toast from '@/utils/toast'

const searchLog = log.extend('SEARCH_RESULTS/FAV')

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'SearchResultFav'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResultFav'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')
	const insets = useSafeAreaInsets()

	const { data: userData } = usePersonalInformation()
	const { data: favoriteFolderList } = useGetFavoritePlaylists(userData?.mid)
	const {
		data: searchData,
		isPending: isPendingSearchData,
		isError: isErrorSearchData,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteSearchFavoriteItems(
		'all',
		query,
		favoriteFolderList?.at(0) ? favoriteFolderList?.at(0)?.id : undefined,
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
				Toast.show('已添加到下一首播放')
			} catch (error) {
				searchLog.sentry('添加到队列失败', error)
				Toast.show('添加到队列失败')
			}
		},
		[addToQueue],
	)

	const onTrackPress = useCallback(
		async (track: Track) => {
			if (
				MULTIPAGE_VIDEO_KEYWORDS.some((keyword) =>
					track.title?.includes(keyword),
				)
			) {
				navigation.navigate('PlaylistMultipage', { bvid: track.id })
				return
			}
			try {
				await addToQueue({
					tracks: [track],
					playNow: true,
					clearQueue: false,
					playNext: false,
				})
			} catch (error) {
				searchLog.sentry('播放失败', error)
				Toast.show('播放失败')
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
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
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
		],
		[playNext],
	)

	const renderSearchResultItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={onTrackPress}
					menuItems={trackMenuItems(item)}
				/>
			)
		},
		[trackMenuItems, onTrackPress],
	)

	const keyExtractor = useCallback((item: Track) => item.id, [])

	if (isPendingSearchData) {
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

	if (isErrorSearchData) {
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
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
				paddingBottom: currentTrack ? 80 : 0,
			}}
		>
			{/* Header with Back Button and Title */}
			<Appbar.Header
				style={{ backgroundColor: colors.surface }}
				elevated
			>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content
					title={`搜索: ${query}`}
					titleStyle={{ fontSize: 18 }}
				/>
			</Appbar.Header>

			{/* Content Area */}
			<FlatList
				contentContainerStyle={{ paddingBottom: 20 }}
				data={searchData?.pages.flatMap((page) => page.tracks)}
				renderItem={renderSearchResultItem}
				keyExtractor={keyExtractor}
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
							style={{ textAlign: 'center', paddingTop: 10 }}
						>
							•
						</Text>
					)
				}
				onEndReached={hasNextPage ? () => fetchNextPage() : null}
				ListEmptyComponent={
					<Text
						style={{
							paddingVertical: 32,
							textAlign: 'center',
							color: colors.onSurfaceVariant,
						}}
					>
						没有在收藏中找到与 &quot;{query}&rdquo; 相关的内容
					</Text>
				}
				showsVerticalScrollIndicator={false}
			/>

			<AddToFavoriteListsModal
				bvid={currentModalBvid}
				visible={modalVisible}
				setVisible={setModalVisible}
			/>

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
