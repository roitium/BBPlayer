import { PlaylistError } from '@/app/playlist/remote/shared/components/PlaylistError'
import { PlaylistLoading } from '@/app/playlist/remote/shared/components/PlaylistLoading'
import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import { useSearchResults } from '@/hooks/queries/bilibili/search'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import type { BilibiliSearchVideo } from '@/types/apis/bilibili'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { formatMMSSToSeconds } from '@/utils/time'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrackList } from '../../shared/components/TrackList'
import { useTrackSelection } from '../../shared/hooks/useTrackSelection'
import { useSearchInteractions } from '../hooks/useSearchInteractions'

const mapApiItemToTrack = (apiItem: BilibiliSearchVideo): BilibiliTrack => {
	console.log(apiItem)
	return {
		id: apiItem.aid,
		uniqueKey: `bilibili::${apiItem.bvid}`,
		source: 'bilibili',
		title: apiItem.title.replace(/<em[^>]*>|<\/em>/g, ''),
		artist: {
			id: apiItem.mid,
			name: apiItem.author,
			remoteId: apiItem.mid.toString(),
			source: 'bilibili',
			createdAt: new Date(apiItem.senddate),
			updatedAt: new Date(apiItem.senddate),
		},
		coverUrl: `https:${apiItem.pic}`,
		duration: apiItem.duration ? formatMMSSToSeconds(apiItem.duration) : 0,
		createdAt: new Date(apiItem.senddate),
		updatedAt: new Date(apiItem.senddate),
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
	}
}

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResult'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])
	const { selected, selectMode, toggle, enterSelectMode } = useTrackSelection()
	const [transitionDone, setTransitionDone] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	const {
		data: searchData,
		isPending: isPendingSearchData,
		isError: isErrorSearchData,
		hasNextPage,
		refetch,
		fetchNextPage,
	} = useSearchResults(query)

	const {
		currentModalTrack,
		modalVisible,
		setModalVisible,
		trackMenuItems,
		playTrack,
	} = useSearchInteractions()

	const uniqueSearchData = useMemo(() => {
		if (!searchData?.pages) {
			return []
		}

		const allTracks = searchData.pages.flatMap((page) => page.result)
		const uniqueMap = new Map(allTracks.map((track) => [track.bvid, track]))
		const uniqueTracks = [...uniqueMap.values()]
		return uniqueTracks.map(mapApiItemToTrack)
	}, [searchData])

	useEffect(() => {
		navigation.addListener('transitionEnd', () => {
			setTransitionDone(true)
		})
	}, [navigation])

	if (isPendingSearchData || !transitionDone) {
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
				<Appbar.Content
					title={
						selectMode ? `已选择 ${selected.size} 首` : `搜索结果 - ${query}`
					}
				/>
				{selectMode ? (
					<Appbar.Action
						icon='playlist-plus'
						onPress={() => {
							const payloads = []
							for (const id of selected) {
								const track = uniqueSearchData.find((t) => t.id === id)
								if (track) {
									payloads.push({
										track: track as Track,
										artist: track.artist!,
									})
								}
							}
							setBatchAddTracksModalPayloads(payloads)
							setBatchAddTracksModalVisible(true)
						}}
					/>
				) : (
					<Appbar.BackAction onPress={() => navigation.goBack()} />
				)}
			</Appbar.Header>

			<View
				style={{
					flex: 1,
					paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
				}}
			>
				<TrackList
					tracks={uniqueSearchData ?? []}
					playTrack={playTrack}
					trackMenuItems={trackMenuItems}
					selectMode={selectMode}
					selected={selected}
					toggle={toggle}
					onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
					hasNextPage={hasNextPage}
					enterSelectMode={enterSelectMode}
					ListHeaderComponent={null}
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
			</View>

			{currentModalTrack && (
				<AddVideoToLocalPlaylistModal
					track={currentModalTrack}
					visible={modalVisible}
					setVisible={setModalVisible}
				/>
			)}
			{selectMode && (
				<BatchAddTracksToLocalPlaylistModal
					visible={batchAddTracksModalVisible}
					setVisible={setBatchAddTracksModalVisible}
					payloads={batchAddTracksModalPayloads}
				/>
			)}
		</View>
	)
}
