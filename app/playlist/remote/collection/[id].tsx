import { PlaylistError } from '@/app/playlist/remote/shared/components/PlaylistError'
import { PlaylistHeader } from '@/app/playlist/remote/shared/components/PlaylistHeader'
import { PlaylistLoading } from '@/app/playlist/remote/shared/components/PlaylistLoading'
import NowPlayingBar from '@/components/NowPlayingBar'
import { usePlaylistSync } from '@/hooks/mutations/db/playlist'
import { useCollectionAllContents } from '@/hooks/queries/bilibili/favorite'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { bv2av } from '@/lib/api/bilibili/utils'
import type { BilibiliMediaItemInCollection } from '@/types/apis/bilibili'
import type { BilibiliTrack, Track } from '@/types/core/media'
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
import { TrackList } from '../shared/components/RemoteTrackList'
import useCheckLinkedToPlaylist from '../shared/hooks/useCheckLinkedToLocalPlaylist'
import { usePlaylistMenu } from '../shared/hooks/usePlaylistMenu'
import { useRemotePlaylist } from '../shared/hooks/useRemotePlaylist'
import { useTrackSelection } from '../shared/hooks/useTrackSelection'

const mapApiItemToTrack = (
	apiItem: BilibiliMediaItemInCollection,
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
			createdAt: new Date(apiItem.pubtime),
			updatedAt: new Date(apiItem.pubtime),
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		createdAt: new Date(apiItem.pubtime),
		updatedAt: new Date(apiItem.pubtime),
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
		trackDownloads: null,
	}
}

export default function CollectionPage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistCollection'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistCollection'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const [refreshing, setRefreshing] = useState(false)
	const linkedPlaylistId = useCheckLinkedToPlaylist(Number(id), 'collection')

	const { selected, selectMode, toggle, enterSelectMode } = useTrackSelection()

	const {
		data: collectionData,
		isPending: isCollectionDataPending,
		isError: isCollectionDataError,
		refetch,
	} = useCollectionAllContents(Number(id))
	const tracks = useMemo(
		() => collectionData?.medias?.map(mapApiItemToTrack) ?? [],
		[collectionData],
	)

	const { playTrack } = useRemotePlaylist()
	const openModal = useModalStore((state) => state.open)

	const trackMenuItems = usePlaylistMenu(playTrack)

	const { mutate: syncCollection } = usePlaylistSync()

	const handleSync = useCallback(() => {
		toast.show('同步中...')
		setRefreshing(true)
		syncCollection(
			{
				remoteSyncId: Number(id),
				type: 'collection',
			},
			{
				onSuccess: (id) => {
					if (!id) return
					navigation.replace('PlaylistLocal', { id: String(id) })
				},
			},
		)
		setRefreshing(false)
	}, [id, navigation, syncCollection])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isCollectionDataPending) {
		return <PlaylistLoading />
	}

	if (isCollectionDataError) {
		return (
			<PlaylistError
				text='加载收藏夹内容失败'
				onRetry={refetch}
			/>
		)
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
						selectMode
							? `已选择 ${selected.size} 首`
							: collectionData.info.title
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
							openModal('BatchAddTracksToLocalPlaylist', {
								payloads,
							})
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
							coverUri={collectionData.info.cover}
							title={collectionData.info.title}
							subtitles={`${collectionData.info.upper.name} • ${collectionData.info.media_count} 首歌曲`}
							description={collectionData.info.intro}
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
						/>
					}
				/>
			</View>
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
