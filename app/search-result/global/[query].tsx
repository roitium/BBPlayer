import { PlaylistError } from '@/components/playlist/PlaylistError'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { PlaylistLoading } from '@/components/playlist/PlaylistLoading'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useSearchResults } from '@/hooks/queries/bilibili/useSearchData'
import type { BilibiliSearchVideo } from '@/types/apis/bilibili'
import { formatMMSSToSeconds } from '@/utils/time'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { useSearchInteractions } from '../hooks/useSearchInteractions'

const mapApiItemToViewTrack = (apiItem: BilibiliSearchVideo) => {
	return {
		id: apiItem.aid,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.author,
			name: apiItem.author,
			source: 'bilibili',
		},
		coverUrl: apiItem.pic,
		duration: formatMMSSToSeconds(apiItem.duration),
		source: 'bilibili', // 明确来源
		isMultiPage: false, // 搜索结果里的视频不当作分P处理
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResult'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()
	const navigation = useNavigation()

	const {
		data: searchData,
		isPending: isPendingSearchData,
		isError: isErrorSearchData,
		hasNextPage,
		fetchNextPage,
	} = useSearchResults(query)

	const { trackMenuItems } = useSearchInteractions()

	const uniqueSearchData = useMemo(() => {
		if (!searchData?.pages) {
			return []
		}

		const allTracks = searchData.pages.flatMap((page) => page.result)
		const uniqueMap = new Map(allTracks.map((track) => [track.bvid, track]))
		const uniqueTracks = [...uniqueMap.values()]
		return uniqueTracks.map(mapApiItemToViewTrack)
	}, [searchData])

	const renderSearchResultItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => toast.show('暂未实现')}
					menuItems={trackMenuItems()}
					data={item}
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
			<Appbar.Header elevated>
				<Appbar.Content title={`搜索结果 - ${query}`} />
				<Appbar.BackAction onPress={() => navigation.goBack()} />
			</Appbar.Header>

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
						没有找到与 &quot;{query}&rdquo; 相关的内容
					</Text>
				}
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
