import { PlaylistError } from '@/app/playlist/remote/shared/components/PlaylistError'
import { PlaylistHeader } from '@/app/playlist/remote/shared/components/PlaylistHeader'
import { PlaylistLoading } from '@/app/playlist/remote/shared/components/PlaylistLoading'
import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import { usePlaylistSync } from '@/hooks/mutations/db/playlist'
import { useInfiniteFavoriteList } from '@/hooks/queries/bilibili/favorite'
import { bv2av } from '@/lib/api/bilibili/utils'
import type { BilibiliFavoriteListContent } from '@/types/apis/bilibili'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import toast from '@/utils/toast'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Appbar, useTheme } from 'react-native-paper'
import type { RootStackParamList } from '../../../../types/navigation'
import { TrackList } from '../shared/components/TrackList'
import useCheckLinkedToPlaylist from '../shared/hooks/useCheckLinkedToLocalPlaylist'
import { usePlaylistMenu } from '../shared/hooks/usePlaylistMenu'
import { useRemotePlaylist } from '../shared/hooks/useRemotePlaylist'
import { useTrackSelection } from '../shared/hooks/useTrackSelection'

const mapApiItemToTrack = (
	apiItem: BilibiliFavoriteListContent,
): BilibiliTrack => {
	return {
		id: bv2av(apiItem.bvid),
		uniqueKey: `bilibili::${apiItem.bvid}`,
		source: 'bilibili',
		title: apiItem.title,
		artist: {
			id: apiItem.upper.mid,
			name: apiItem.upper.name,
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
			avatarUrl: apiItem.upper.face,
			createdAt: new Date(apiItem.pubdate),
			updatedAt: new Date(apiItem.pubdate),
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		createdAt: new Date(apiItem.pubdate),
		updatedAt: new Date(apiItem.pubdate),
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
	}
}

export default function FavoritePage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistFavorite'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistFavorite'>
		>()
	const [refreshing, setRefreshing] = useState(false)
	const linkedPlaylistId = useCheckLinkedToPlaylist(Number(id), 'favorite')
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<Track | undefined>(
		undefined,
	)

	const { selected, selectMode, toggle, enterSelectMode } = useTrackSelection()
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])
	const [transitionDone, setTransitionDone] = useState(false)

	const {
		data: favoriteData,
		isPending: isFavoriteDataPending,
		isError: isFavoriteDataError,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteFavoriteList(Number(id))
	const tracks = useMemo(
		() =>
			favoriteData?.pages
				.flatMap((page) => page.medias)
				.map(mapApiItemToTrack) ?? [],
		[favoriteData],
	)

	const { mutate: syncFavorite } = usePlaylistSync()

	const { playTrack } = useRemotePlaylist()

	const trackMenuItems = usePlaylistMenu(
		playTrack,
		setCurrentModalTrack,
		setModalVisible,
	)

	const handleSync = useCallback(() => {
		if (favoriteData?.pages.flatMap((page) => page.medias).length === 0) {
			toast.info('收藏夹为空，无需同步')
			return
		}
		toast.show('同步中...')
		setRefreshing(true)
		syncFavorite(
			{
				remoteSyncId: Number(id),
				type: 'favorite',
			},
			{
				onSuccess: (id) => {
					if (!id) return
					navigation.replace('PlaylistLocal', { id: String(id) })
				},
			},
		)
		setRefreshing(false)
	}, [favoriteData?.pages, id, navigation, syncFavorite])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	useEffect(() => {
		navigation.addListener('transitionEnd', () => {
			setTransitionDone(true)
		})
	}, [navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isFavoriteDataPending || !transitionDone) {
		return <PlaylistLoading />
	}

	if (isFavoriteDataError) {
		return (
			<PlaylistError
				text='加载收藏夹内容失败'
				onRetry={refetch}
			/>
		)
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.Content
					title={
						selectMode
							? `已选择 ${selected.size} 首`
							: favoriteData.pages[0].info.title
					}
				/>
				{selectMode ? (
					<Appbar.Action
						icon='playlist-plus'
						onPress={() => {
							const payloads = []
							for (const id of selected) {
								const track = tracks.find((t) => t.id === id)
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
				}}
			>
				<TrackList
					tracks={tracks}
					playTrack={playTrack}
					trackMenuItems={trackMenuItems}
					selectMode={selectMode}
					selected={selected}
					toggle={toggle}
					enterSelectMode={enterSelectMode}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={favoriteData.pages[0].info.cover}
							title={favoriteData.pages[0].info.title}
							subtitles={`${favoriteData.pages[0].info.upper.name} • ${favoriteData.pages[0].info.media_count} 首歌曲`}
							description={favoriteData.pages[0].info.intro}
							onClickMainButton={handleSync}
							mainButtonIcon={'sync'}
							linkedPlaylistId={linkedPlaylistId}
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
					onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
					hasNextPage={hasNextPage}
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
