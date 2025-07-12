import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import { PlaylistAppBar } from '@/components/playlist/PlaylistAppBar'
import { PlaylistError } from '@/components/playlist/PlaylistError'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { PlaylistLoading } from '@/components/playlist/PlaylistLoading'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useSearchResults } from '@/hooks/queries/bilibili/useSearchData'
import type { Track } from '@/types/core/media'
import { LegendList } from '@legendapp/list'
import { type RouteProp, useRoute } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { useSearchInteractions } from '../hooks/useSearchInteractions'

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResult'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()

	const [searchQuery, setSearchQuery] = useState(query || '')

	useEffect(() => {
		if (query) {
			setSearchQuery(query)
		}
	}, [query])

	const {
		data: searchData,
		isPending: isPendingSearchData,
		isError: isErrorSearchData,
		hasNextPage,
		fetchNextPage,
	} = useSearchResults(searchQuery)

	const {
		modalVisible,
		currentModalBvid,
		setModalVisible,
		onTrackPress,
		trackMenuItems,
	} = useSearchInteractions()

	const uniqueSearchData = useMemo(() => {
		if (!searchData?.pages) {
			return []
		}

		const allTracks = searchData.pages.flatMap((page) => page.tracks)
		const uniqueMap = new Map(allTracks.map((track) => [track.id, track]))
		return [...uniqueMap.values()]
	}, [searchData])

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
			<PlaylistAppBar />

			<LegendList
				contentContainerStyle={{
					paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
				}}
				data={uniqueSearchData}
				renderItem={renderSearchResultItem}
				keyExtractor={keyExtractor}
				onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
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
					) : null
				}
				ListEmptyComponent={
					<Text
						style={{
							paddingVertical: 32,
							textAlign: 'center',
							color: colors.onSurfaceVariant,
						}}
					>
						没有找到与 &quot;{searchQuery}&rdquo; 相关的内容
					</Text>
				}
			/>

			<AddToFavoriteListsModal
				bvid={currentModalBvid}
				visible={modalVisible}
				setVisible={setModalVisible}
			/>
		</View>
	)
}
