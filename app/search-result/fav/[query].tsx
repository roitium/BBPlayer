import { PlaylistAppBar } from '@/components/playlist/PlaylistAppBar'
import { PlaylistError } from '@/components/playlist/PlaylistError'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { PlaylistLoading } from '@/components/playlist/PlaylistLoading'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetFavoritePlaylists,
	useInfiniteSearchFavoriteItems,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { BilibiliFavoriteListContent } from '@/types/apis/bilibili'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import { type RouteProp, useRoute } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { useSearchInteractions } from '../hooks/useSearchInteractions'

const mapApiItemToViewTrack = (apiItem: BilibiliFavoriteListContent) => {
	return {
		id: apiItem.bvid, // 仅仅用于列表的 key，不会作为真实 id 传递
		cid: apiItem.id,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.id,
			name: apiItem.upper.name,
			source: 'bilibili',
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		source: 'bilibili', // 明确来源
		isMultiPage: false, // 收藏夹里的视频不当作分P处理
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResultFav'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()
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
		favoriteFolderList?.at(0)?.id,
	)
	const tracksForDisplay = useMemo(
		() =>
			searchData?.pages
				.flatMap((page) => page.medias)
				.map(mapApiItemToViewTrack) ?? [],
		[searchData],
	)

	const { trackMenuItems } = useSearchInteractions()

	const renderSearchResultItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={() => toast.show('暂未实现')}
					menuItems={trackMenuItems()}
				/>
			)
		},
		[trackMenuItems],
	)

	const keyExtractor = useCallback((item: UITrack) => item.bvid, [])

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
			<PlaylistAppBar title={`搜索结果 - ${query}`} />

			<LegendList
				contentContainerStyle={{
					paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
				}}
				data={tracksForDisplay}
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

			{/* <AddToFavoriteListsModal
				key={currentModalBvid}
				bvid={currentModalBvid}
				visible={modalVisible}
				setVisible={setModalVisible}
			/> */}
		</View>
	)
}
