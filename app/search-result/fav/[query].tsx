import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
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
import type { Track } from '@/types/core/media'
import { LegendList } from '@legendapp/list'
import { type RouteProp, useRoute } from '@react-navigation/native'
import { useCallback } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { useSearchInteractions } from '../hooks/useSearchInteractions'

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

	const {
		modalVisible,
		currentModalBvid,
		setModalVisible,
		onTrackPress,
		trackMenuItems,
	} = useSearchInteractions()

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
			<PlaylistAppBar title={`搜索结果 - ${query}`} />

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
