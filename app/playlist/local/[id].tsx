import { AnimatedModal } from '@/components/commonUIs/AnimatedModal'
import FunctionalMenu from '@/components/commonUIs/FunctionalMenu'
import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import EditPlaylistMetadataModal from '@/components/modals/edit-metadata/editPlaylistMetadataModal'
import EditTrackMetadataModal from '@/components/modals/edit-metadata/editTrackMetadataModal'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import {
	useBatchDeleteTracksFromLocalPlaylist,
	useDeletePlaylist,
	useDuplicatePlaylist,
	usePlaylistSync,
} from '@/hooks/mutations/db/playlist'
import {
	usePlaylistContents,
	usePlaylistMetadata,
	useSearchTracksInPlaylist,
} from '@/hooks/queries/db/playlist'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue'
import type { Track } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import {
	type RouteProp,
	useNavigation,
	usePreventRemove,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, useWindowDimensions, View } from 'react-native'
import {
	Appbar,
	Button,
	Dialog,
	Menu,
	Portal,
	Searchbar,
	TextInput,
	useTheme,
} from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { PlaylistHeader } from './components/LocalPlaylistHeader'
import { LocalTrackList } from './components/LocalTrackList'
import { PlaylistError } from './components/PlaylistError'
import { PlaylistLoading } from './components/PlaylistLoading'
import { useLocalPlaylistMenu } from './hooks/useLocalPlaylistMenu'
import { useLocalPlaylistPlayer } from './hooks/useLocalPlaylistPlayer'
import { useTrackSelection } from './hooks/useTrackSelection'

const SEARCHBAR_HEIGHT = 72
const SCOPE = 'UI.Playlist.Local'

export default function LocalPlaylistPage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistLocal'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistLocal'>
		>()
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()
	const [addTrackModalVisible, setAddTrackModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<Track | undefined>(
		undefined,
	)
	const [editPlaylistModalVisible, setEditPlaylistModalVisible] =
		useState(false)
	const [duplicatePlaylistModalVisible, setDuplicatePlaylistModalVisible] =
		useState(false)
	const [duplicatePlaylistName, setDuplicatePlaylistName] = useState('')
	const [functionalMenuVisible, setFunctionalMenuVisible] = useState(false)
	const dimensions = useWindowDimensions()
	const [searchQuery, setSearchQuery] = useState('')
	const [startSearch, setStartSearch] = useState(false)
	const searchbarHeight = useSharedValue(0)
	const debouncedQuery = useDebouncedValue(searchQuery, 200)
	const { selected, selectMode, toggle, enterSelectMode, exitSelectMode } =
		useTrackSelection()
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])
	const [editTrackModalVisible, setEditTrackModalVisible] = useState(false)
	const [transitionDone, setTransitionDone] = useState(false)

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
		data: searchData,
		isError: isSearchError,
		error: searchError,
	} = useSearchTracksInPlaylist(Number(id), debouncedQuery, startSearch)

	const finalPlaylistData = useMemo(() => {
		if (!startSearch || !debouncedQuery.trim()) return playlistData ?? []

		if (isSearchError) {
			toastAndLogError('搜索失败', searchError, SCOPE)
			return []
		}

		return searchData ?? []
	}, [
		startSearch,
		debouncedQuery,
		playlistData,
		isSearchError,
		searchData,
		searchError,
	])

	const {
		data: playlistMetadata,
		isPending: isPlaylistMetadataPending,
		isError: isPlaylistMetadataError,
	} = usePlaylistMetadata(Number(id))

	useEffect(() => {
		if (playlistMetadata)
			setDuplicatePlaylistName(playlistMetadata.title + '-副本')
	}, [playlistMetadata])

	const { mutate: syncPlaylist } = usePlaylistSync()
	const { mutate: duplicatePlaylist } = useDuplicatePlaylist()
	const { mutate: deletePlaylist } = useDeletePlaylist()
	const { mutate: deleteTrackFromLocalPlaylist } =
		useBatchDeleteTracksFromLocalPlaylist()

	const onClickDuplicateLocalPlaylist = useCallback(() => {
		duplicatePlaylist(
			{
				playlistId: Number(id),
				name: duplicatePlaylistName,
			},
			{
				onSuccess: (id) =>
					navigation.navigate('PlaylistLocal', { id: String(id) }),
			},
		)
		setDuplicatePlaylistModalVisible(false)
	}, [duplicatePlaylist, duplicatePlaylistName, id, navigation])

	const onClickDeletePlaylist = useCallback(() => {
		deletePlaylist(
			{
				playlistId: Number(id),
			},
			{
				onSuccess: () => navigation.goBack(),
			},
		)
		navigation.goBack()
	}, [deletePlaylist, id, navigation])

	const handleSync = useCallback(() => {
		if (!playlistMetadata || !playlistMetadata.remoteSyncId) {
			toast.error('无法同步，因为未找到播放列表元数据或 remoteSyncId 为空')
			return
		}
		toast.show('同步中...')
		syncPlaylist({
			remoteSyncId: playlistMetadata.remoteSyncId,
			type: playlistMetadata.type,
		})
	}, [playlistMetadata, syncPlaylist])

	const { playAll, handleTrackPress } =
		useLocalPlaylistPlayer(filteredPlaylistData)

	const deleteTrack = useCallback(
		(trackId: number) => {
			deleteTrackFromLocalPlaylist({
				trackIds: [trackId],
				playlistId: Number(id),
			})
		},
		[deleteTrackFromLocalPlaylist, id],
	)

	const openAddToPlaylistModal = useCallback((track: Track) => {
		setCurrentModalTrack(track)
		setAddTrackModalVisible(true)
	}, [])

	const openEditTrackModal = useCallback((track: Track) => {
		setCurrentModalTrack(track)
		setEditTrackModalVisible(true)
	}, [])

	const trackMenuItems = useLocalPlaylistMenu({
		deleteTrack,
		openAddToPlaylistModal,
		openEditTrackModal,
		playlist: playlistMetadata!,
	})

	const deleteSelectedTracks = useCallback(() => {
		if (selected.size === 0) return
		deleteTrackFromLocalPlaylist({
			trackIds: Array.from(selected),
			playlistId: Number(id),
		})
		exitSelectMode()
	}, [selected, id, deleteTrackFromLocalPlaylist, exitSelectMode])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	usePreventRemove(startSearch || selectMode, () => {
		if (startSearch) setStartSearch(false)
		if (selectMode) exitSelectMode()
	})

	useEffect(() => {
		searchbarHeight.set(
			withTiming(startSearch ? SEARCHBAR_HEIGHT : 0, { duration: 180 }),
		)
	}, [searchbarHeight, startSearch])

	useEffect(() => {
		if (batchAddTracksModalVisible) {
			const payloads = []
			for (const trackId of selected) {
				const track = playlistData?.find((t) => t.id === trackId)
				if (!track) {
					toast.error(`批量添加歌曲失败：未找到 track: ${trackId}`)
					return
				}
				payloads.push({
					track: {
						...track,
						artistId: track.artist?.id,
					},
					artist: track.artist!,
				})
			}
			setBatchAddTracksModalPayloads(payloads)
		}
	}, [batchAddTracksModalVisible, playlistData, selected])

	const searchbarAnimatedStyle = useAnimatedStyle(() => ({
		height: searchbarHeight.value,
	}))

	useEffect(() => {
		navigation.addListener('transitionEnd', () => {
			setTransitionDone(true)
		})
	}, [navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isPlaylistDataPending || isPlaylistMetadataPending || !transitionDone) {
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
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content
					title={
						selectMode ? `已选择 ${selected.size} 首` : playlistMetadata.title
					}
				/>
				{selectMode ? (
					<>
						{playlistMetadata.type === 'local' && (
							<Appbar.Action
								icon='trash-can'
								onPress={() =>
									Alert.alert(
										'移除歌曲',
										'确定从播放列表移除这些歌曲？',
										[
											{ text: '取消', style: 'cancel' },
											{ text: '确定', onPress: deleteSelectedTracks },
										],
										{ cancelable: true },
									)
								}
							/>
						)}
						<Appbar.Action
							icon='playlist-plus'
							onPress={() => setBatchAddTracksModalVisible(true)}
						/>
					</>
				) : (
					<>
						<Appbar.Action
							icon={startSearch ? 'close' : 'magnify'}
							onPress={() => setStartSearch((prev) => !prev)}
						/>
						<Appbar.Action
							icon='dots-vertical'
							onPress={() => setFunctionalMenuVisible(true)}
						/>
					</>
				)}
			</Appbar.Header>

			{/* 搜索框 */}
			<Animated.View style={[{ overflow: 'hidden' }, searchbarAnimatedStyle]}>
				<Searchbar
					mode='view'
					placeholder='搜索歌曲'
					onChangeText={setSearchQuery}
					value={searchQuery}
				/>
			</Animated.View>

			<LocalTrackList
				tracks={finalPlaylistData ?? []}
				playlist={playlistMetadata}
				handleTrackPress={handleTrackPress}
				trackMenuItems={trackMenuItems}
				selectMode={selectMode}
				selected={selected}
				toggle={toggle}
				enterSelectMode={enterSelectMode}
				ListHeaderComponent={
					<PlaylistHeader
						playlist={playlistMetadata}
						onClickPlayAll={playAll}
						onClickSync={handleSync}
						validTrackCount={filteredPlaylistData.length}
						onClickCopyToLocalPlaylist={() =>
							setDuplicatePlaylistModalVisible(true)
						}
						onPressAuthor={(author) =>
							author.remoteId &&
							navigation.navigate('PlaylistUploader', { mid: author.remoteId })
						}
					/>
				}
				bottomPadding={currentTrack ? 70 + insets.bottom : insets.bottom}
			/>

			{currentModalTrack && (
				<AddVideoToLocalPlaylistModal
					track={currentModalTrack}
					visible={addTrackModalVisible}
					setVisible={setAddTrackModalVisible}
				/>
			)}

			<EditPlaylistMetadataModal
				playlist={playlistMetadata}
				visiable={editPlaylistModalVisible}
				setVisible={setEditPlaylistModalVisible}
			/>
			<AnimatedModal
				visible={duplicatePlaylistModalVisible}
				onDismiss={() => setDuplicatePlaylistModalVisible(false)}
			>
				<Dialog.Title>复制播放列表</Dialog.Title>
				<Dialog.Content>
					<TextInput
						label='新播放列表名称'
						value={duplicatePlaylistName}
						onChangeText={setDuplicatePlaylistName}
						mode='outlined'
						numberOfLines={1}
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
					/>
				</Dialog.Content>
				<Dialog.Actions>
					<Button onPress={() => setDuplicatePlaylistModalVisible(false)}>
						取消
					</Button>
					<Button onPress={onClickDuplicateLocalPlaylist}>确定</Button>
				</Dialog.Actions>
			</AnimatedModal>

			<Portal>
				<FunctionalMenu
					visible={functionalMenuVisible}
					onDismiss={() => setFunctionalMenuVisible(false)}
					anchor={{
						x: dimensions.width - 10,
						y: 60 + insets.top,
					}}
				>
					<Menu.Item
						onPress={() => {
							setFunctionalMenuVisible(false)
							setEditPlaylistModalVisible(true)
						}}
						title='编辑播放列表信息'
						leadingIcon='pencil'
					/>
					<Menu.Item
						onPress={() => {
							Alert.alert(
								'删除播放列表',
								'确定要删除此播放列表吗？',
								[
									{
										text: '取消',
										style: 'cancel',
									},
									{
										text: '确定',
										onPress: () => {
											setFunctionalMenuVisible(false)
											onClickDeletePlaylist()
										},
									},
								],
								{ cancelable: true },
							)
						}}
						title='删除播放列表'
						leadingIcon='delete'
						titleStyle={{ color: colors.error }}
					/>
				</FunctionalMenu>
			</Portal>

			{selectMode && (
				<BatchAddTracksToLocalPlaylistModal
					visible={batchAddTracksModalVisible}
					setVisible={setBatchAddTracksModalVisible}
					payloads={batchAddTracksModalPayloads}
				/>
			)}

			{currentModalTrack && (
				<EditTrackMetadataModal
					track={currentModalTrack}
					visiable={editTrackModalVisible}
					setVisible={setEditTrackModalVisible}
				/>
			)}
		</View>
	)
}
