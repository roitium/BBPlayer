import { PlaylistError } from '@/app/playlist/remote/shared/components/PlaylistError'
import { PlaylistHeader } from '@/app/playlist/remote/shared/components/PlaylistHeader'
import { PlaylistLoading } from '@/app/playlist/remote/shared/components/PlaylistLoading'
import NowPlayingBar from '@/components/NowPlayingBar'
import { usePlaylistSync } from '@/hooks/mutations/db/playlist'
import {
	useGetMultiPageList,
	useGetVideoDetails,
} from '@/hooks/queries/bilibili/video'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { bv2av } from '@/lib/api/bilibili/utils'
import type {
	BilibiliMultipageVideo,
	BilibiliVideoDetails,
} from '@/types/apis/bilibili'
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
	mp: BilibiliMultipageVideo,
	video: BilibiliVideoDetails,
): BilibiliTrack => {
	return {
		id: mp.cid,
		uniqueKey: `bilibili::${video.bvid}::${mp.cid}`,
		source: 'bilibili',
		title: mp.part,
		artist: {
			id: video.owner.mid,
			name: video.owner.name,
			remoteId: video.owner.mid.toString(),
			source: 'bilibili',
			createdAt: new Date(video.pubdate),
			updatedAt: new Date(video.pubdate),
		},
		coverUrl: video.pic,
		duration: mp.duration,
		createdAt: new Date(video.pubdate),
		updatedAt: new Date(video.pubdate),
		bilibiliMetadata: {
			bvid: video.bvid,
			cid: mp.cid,
			isMultiPage: true,
			videoIsValid: true,
			mainTrackTitle: video.title,
		},
		trackDownloads: null,
	}
}

export default function MultipagePage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistMultipage'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistMultipage'>>()
	const { bvid } = route.params
	const [refreshing, setRefreshing] = useState(false)
	const { colors } = useTheme()
	const linkedPlaylistId = useCheckLinkedToPlaylist(bv2av(bvid), 'multi_page')

	const { selected, selectMode, toggle, enterSelectMode } = useTrackSelection()
	const openModal = useModalStore((state) => state.open)

	const {
		data: rawMultipageData,
		isPending: isMultipageDataPending,
		isError: isMultipageDataError,
		refetch,
	} = useGetMultiPageList(bvid)

	const {
		data: videoData,
		isError: isVideoDataError,
		isPending: isVideoDataPending,
	} = useGetVideoDetails(bvid)

	const tracksData = useMemo(() => {
		if (!rawMultipageData || !videoData) {
			return []
		}
		return rawMultipageData.map((item) => mapApiItemToTrack(item, videoData))
	}, [rawMultipageData, videoData])

	const { mutate: syncMultipage } = usePlaylistSync()

	const { playTrack } = useRemotePlaylist()

	const trackMenuItems = usePlaylistMenu(playTrack)

	const handleSync = useCallback(() => {
		toast.show('同步中...')
		setRefreshing(true)
		syncMultipage(
			{
				remoteSyncId: bv2av(bvid),
				type: 'multi_page',
			},
			{
				onSuccess: (id) => {
					if (!id) return
					navigation.replace('PlaylistLocal', { id: String(id) })
				},
			},
		)
		setRefreshing(false)
	}, [bvid, navigation, syncMultipage])

	useEffect(() => {
		if (typeof bvid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [bvid, navigation])

	if (typeof bvid !== 'string') {
		return null
	}

	if (isMultipageDataPending || isVideoDataPending) {
		return <PlaylistLoading />
	}

	if (isMultipageDataError || isVideoDataError) {
		return <PlaylistError text='加载失败' />
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.Content
					title={selectMode ? `已选择 ${selected.size} 首` : videoData.title}
				/>
				{selectMode ? (
					<Appbar.Action
						icon='playlist-plus'
						onPress={() => {
							const payloads = []
							for (const id of selected) {
								const track = tracksData.find((t) => t.id === id)
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
					tracks={tracksData}
					playTrack={playTrack}
					trackMenuItems={trackMenuItems}
					selectMode={selectMode}
					selected={selected}
					toggle={toggle}
					enterSelectMode={enterSelectMode}
					showItemCover={false}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={videoData.pic}
							title={videoData.title}
							subtitles={`${videoData.owner.name} • ${tracksData.length} 首歌曲`}
							description={videoData.desc}
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
