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
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue'
import type { Playlist, Track } from '@/types/core/media'
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
import { FlashList } from '@shopify/flash-list'
import * as Clipboard from 'expo-clipboard'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, useWindowDimensions, View } from 'react-native'
import {
	Appbar,
	Button,
	Dialog,
	Divider,
	Menu,
	Portal,
	Searchbar,
	Text,
	TextInput,
	useTheme,
} from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../types/navigation'
import { PlaylistHeader } from './components/LocalPlaylistHeader'
import type { TrackMenuItem } from './components/LocalPlaylistItem'
import { TrackListItem } from './components/LocalPlaylistItem'

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
	const addToQueue = usePlayerStore((state) => state.addToQueue)
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
	const [selected, setSelected] = useState<Set<number>>(() => new Set()) // 使用 track id 作为索引
	const [selectMode, setSelectMode] = useState<boolean>(false)
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])
	const [editTrackModalVisible, setEditTrackModalVisible] = useState(false)

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
				toastAndLogError('添加到队列失败', error, SCOPE)
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
				toastAndLogError('播放全部失败', error, SCOPE)
			}
		},
		[addToQueue, filteredPlaylistData],
	)

	const trackMenuItems = useCallback(
		(item: Track) => {
			const menuItems: TrackMenuItem[] = [
				{
					title: '下一首播放',
					leadingIcon: 'skip-next-circle-outline',
					onPress: () => playNext(item),
				},
				{
					title: '添加到本地歌单',
					leadingIcon: 'playlist-plus',
					onPress: () => {
						setCurrentModalTrack(item)
						setAddTrackModalVisible(true)
					},
				},
			]
			if (item.source === 'bilibili') {
				menuItems.push(
					{
						title: '查看详细信息',
						leadingIcon: 'file-document-outline',
						onPress: () =>
							navigation.navigate('PlaylistMultipage', {
								bvid: item.bilibiliMetadata.bvid,
							}),
					},
					{
						title: '查看 up 主作品',
						leadingIcon: 'account-music',
						onPress: () => {
							if (!item.artist?.remoteId) {
								return
							}
							navigation.navigate('PlaylistUploader', {
								mid: item.artist?.remoteId,
							})
						},
					},
				)
			}
			menuItems.push(
				{
					title: '复制封面链接',
					leadingIcon: 'link',
					onPress: () => {
						void Clipboard.setStringAsync(item.coverUrl ?? '')
						toast.success('已复制到剪贴板')
					},
				},
				{
					title: '改名',
					leadingIcon: 'pencil',
					onPress: () => {
						setCurrentModalTrack(item)
						setEditTrackModalVisible(true)
					},
				},
			)
			if (playlistMetadata?.type === 'local') {
				menuItems.push({
					title: '删除歌曲',
					leadingIcon: 'delete',
					onPress: () => {
						deleteTrackFromLocalPlaylist({
							trackIds: [item.id],
							playlistId: Number(id),
						})
					},
					danger: true,
				})
			}
			return menuItems
		},
		[
			deleteTrackFromLocalPlaylist,
			id,
			navigation,
			playNext,
			playlistMetadata?.type,
		],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			void playAll(track.uniqueKey)
		},
		[playAll],
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

	const deleteSelectedTracks = useCallback(() => {
		if (selected.size === 0) return
		deleteTrackFromLocalPlaylist({
			trackIds: Array.from(selected),
			playlistId: Number(id),
		})
		setSelectMode(false)
		setSelected(new Set())
	}, [selected, id, deleteTrackFromLocalPlaylist])

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
					data={item}
					playlist={playlistMetadata as Playlist}
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[
			enterSelectMode,
			handleTrackPress,
			playlistMetadata,
			selectMode,
			selected,
			toggle,
			trackMenuItems,
		],
	)

	const keyExtractor = useCallback((item: Track) => String(item.id), [])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	usePreventRemove(startSearch || selectMode, () => {
		setStartSearch(false)
		setSelectMode(false)
		setSelected(new Set())
	})

	useEffect(() => {
		searchbarHeight.set(
			withTiming(startSearch ? SEARCHBAR_HEIGHT : 0, { duration: 180 }),
		)
	}, [searchbarHeight, startSearch])

	useEffect(() => {
		if (batchAddTracksModalVisible) {
			const payloads = []
			for (const id of selected) {
				const track = playlistData?.find((t) => t.id === id)
				if (!track) {
					toast.error(`批量添加歌曲失败：未找到 track: ${id}`)
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

			<FlashList
				data={finalPlaylistData ?? []}
				renderItem={renderItem}
				extraData={{ selectMode, selected }}
				ItemSeparatorComponent={() => <Divider />}
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
