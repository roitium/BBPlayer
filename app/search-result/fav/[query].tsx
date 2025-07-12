import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import { PlaylistAppBar } from '@/components/playlist/PlaylistAppBar'
import { PlaylistError } from '@/components/playlist/PlaylistError'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import { PlaylistLoading } from '@/components/playlist/PlaylistLoading'
import { MULTIPAGE_VIDEO_KEYWORDS } from '@/constants/search'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetFavoritePlaylists,
	useInfiniteSearchFavoriteItems,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
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
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

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
				toast.success('添加到下一首播放成功')
			} catch (error) {
				searchLog.sentry('添加到队列失败', error)
				toast.show('添加到队列失败')
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
				toast.show('播放失败')
			}
		},
		[addToQueue, navigation],
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
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
				},
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
		[playNext, navigation],
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
		return <PlaylistLoading />
	}

	if (isErrorSearchData) {
		return <PlaylistError text='加载失败' />
	}

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<PlaylistAppBar title={`搜索: ${query}`} />

			{/* Content Area */}
			<LegendList
				contentContainerStyle={{
					paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
				}}
				data={searchData?.pages.flatMap((page) => page.tracks)}
				renderItem={renderSearchResultItem}
				ItemSeparatorComponent={() => <Divider />}
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
		</View>
	)
}
