import AddVideoToLocalPlaylistModal from '@/components/modals/AddVideoToLocalPlaylistModal'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useCopyRemotePlaylistToLocalPlaylist,
	usePlaylistContents,
	usePlaylistMetadata,
	usePlaylistSync,
} from '@/hooks/queries/db/usePlaylist'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Appbar, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../types/navigation'
import { PlaylistHeader } from './LocalPlaylistHeader'
import { TrackListItem } from './LocalPlaylistItem'

const playlistLog = log.extend('PLAYLIST/LOCAL')

export default function LocalPlaylistPage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistLocal'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistLocal'>
		>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<Track | undefined>(
		undefined,
	)

	const {
		data: playlistData,
		isPending: isPlaylistDataPending,
		isError: isPlaylistDataError,
	} = usePlaylistContents(Number(id))
	const filteredPlaylistData = useMemo(
		() =>
			playlistData?.filter(
				(item) =>
					item.source === 'bilibili' && item.bilibiliMetadata.videoIsValid,
			) ?? [],
		[playlistData],
	)

	const {
		data: playlistMetadata,
		isPending: isPlaylistMetadataPending,
		isError: isPlaylistMetadataError,
	} = usePlaylistMetadata(Number(id))

	const { mutateAsync: syncPlaylist } = usePlaylistSync()

	const { mutateAsync: copyToLocalPlaylist } =
		useCopyRemotePlaylistToLocalPlaylist()

	const onClickCopyToLocalPlaylist = useCallback(async () => {
		await copyToLocalPlaylist(
			{
				playlistId: Number(id),
			},
			{
				onSuccess: (id) =>
					navigation.navigate('PlaylistLocal', { id: String(id) }),
			},
		)
	}, [copyToLocalPlaylist, id, navigation])

	const handleSync = useCallback(async () => {
		if (!playlistMetadata || !playlistMetadata.remoteSyncId) {
			toast.error('无法同步，因为未找到播放列表元数据或 remoteSyncId 为空')
			return
		}
		toast.show('同步中...')
		await syncPlaylist({
			remoteSyncId: playlistMetadata.remoteSyncId,
			type: playlistMetadata.type,
		})
	}, [playlistMetadata, syncPlaylist])

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
				playlistLog.error('添加到队列失败', error)
				toast.error('添加到队列失败', {
					description: flatErrorMessage(error as Error),
				})
			}
		},
		[addToQueue],
	)

	const playAll = useCallback(
		async (startFromId?: string) => {
			try {
				if (!filteredPlaylistData) return
				await addToQueue({
					tracks: filteredPlaylistData,
					playNow: true,
					clearQueue: true,
					startFromId: startFromId,
					playNext: false,
				})
			} catch (error) {
				playlistLog.error('播放全部失败', error)
				toast.error('播放全部失败', {
					description: flatErrorMessage(error as Error),
				})
			}
		},
		[addToQueue, filteredPlaylistData],
	)

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playNext(item),
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
		[playNext],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			void playAll(String(track.id))
		},
		[playAll],
	)

	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => handleTrackPress(item)}
					menuItems={trackMenuItems(item)}
					disabled={
						item.source === 'bilibili' && !item.bilibiliMetadata.videoIsValid
					}
					data={{
						cover: item.coverUrl ?? undefined,
						artistCover: item.artist?.avatarUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
				/>
			)
		},
		[handleTrackPress, trackMenuItems],
	)

	const keyExtractor = useCallback((item: Track) => String(item.id), [])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isPlaylistDataPending || isPlaylistMetadataPending) {
		return <PlaylistLoading />
	}

	if (isPlaylistDataError || isPlaylistMetadataError) {
		return <PlaylistError text='加载播放列表内容失败' />
	}

	if (!playlistMetadata) {
		return <PlaylistError text='未找到播放列表元数据' />
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.Content title={playlistMetadata.title} />
				<Appbar.BackAction onPress={() => navigation.goBack()} />
			</Appbar.Header>

			<View
				style={{
					flex: 1,
				}}
			>
				<LegendList
					data={playlistData}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					ListHeaderComponent={
						<PlaylistHeader
							playlist={playlistMetadata}
							onClickPlayAll={playAll}
							onClickSync={handleSync}
							validTrackCount={filteredPlaylistData.length}
							onClickCopyToLocalPlaylist={onClickCopyToLocalPlaylist}
						/>
					}
					keyExtractor={keyExtractor}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
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
		</View>
	)
}
