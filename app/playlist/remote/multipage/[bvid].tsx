import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { usePlaylistSync } from '@/hooks/mutations/db/playlist'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetMultiPageList,
	useGetVideoDetails,
} from '@/hooks/queries/bilibili/video'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { bv2av } from '@/lib/api/bilibili/utils'
import type {
	BilibiliMultipageVideo,
	BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import toast from '@/utils/toast'
import {
	type RouteProp,
	useNavigation,
	usePreventRemove,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Appbar, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'
import useCheckLinkedToPlaylist from '../hooks/useCheckLinkedToLocalPlaylist'

const mapApiItemToTrack = (
	mp: BilibiliMultipageVideo,
	video: BilibiliVideoDetails,
): BilibiliTrack => {
	return {
		id: mp.cid,
		uniqueKey: `bilibili::${video.bvid}::${video.cid}`,
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
		playHistory: [],
		createdAt: new Date(video.pubdate),
		updatedAt: new Date(video.pubdate),
		bilibiliMetadata: {
			bvid: video.bvid,
			cid: mp.cid,
			isMultiPage: true,
			videoIsValid: true,
			mainTrackTitle: video.title,
		},
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
	const currentTrack = useCurrentTrack()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const insets = useSafeAreaInsets()
	const linkedPlaylistId = useCheckLinkedToPlaylist(bv2av(bvid), 'multi_page')
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<
		BilibiliTrack | undefined
	>(undefined)

	const [selected, setSelected] = useState<Set<number>>(() => new Set()) // 使用 track id 作为索引
	const [selectMode, setSelectMode] = useState<boolean>(false)
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])

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

	const playTrack = useCallback(
		(track: BilibiliTrack, playNext = false) => {
			void addToQueue({
				tracks: [track],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue],
	)

	const trackMenuItems = useCallback(
		(item: BilibiliTrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playTrack(item, true),
			},
			{
				title: '添加到本地歌单',
				leadingIcon: 'playlist-plus',
				onPress: () => {
					setCurrentModalTrack(item)
					setModalVisible(true)
				},
			},
		],
		[playTrack],
	)

	const toggle = useCallback((id: number) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const enterSelectMode = useCallback((id: number) => {
		setSelectMode(true)
		setSelected(new Set([id]))
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: BilibiliTrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => playTrack(item)}
					menuItems={trackMenuItems(item)}
					showCoverImage={false}
					data={{
						cover: item.coverUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[playTrack, trackMenuItems, toggle, selected, selectMode, enterSelectMode],
	)

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

	const keyExtractor = useCallback((item: BilibiliTrack) => {
		return String(item.id)
	}, [])

	useEffect(() => {
		if (typeof bvid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [bvid, navigation])

	usePreventRemove(selectMode, () => {
		setSelectMode(false)
		setSelected(new Set())
	})

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
				<FlashList
					data={tracksData}
					extraData={{ selectMode }}
					estimatedItemSize={70}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
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
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={false}
					ListFooterComponent={
						<Text
							variant='titleMedium'
							style={{
								textAlign: 'center',
								paddingTop: 10,
							}}
						>
							•
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
