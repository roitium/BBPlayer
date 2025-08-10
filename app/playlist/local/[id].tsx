import AddVideoToLocalPlaylistModal from '@/components/modals/AddVideoToLocalPlaylistModal'
import EditPlaylistMetadataModal from '@/components/modals/edit-metadata/editPlaylistMetadataModal'
import {
	useDeletePlaylist,
	useDeleteTrackFromLocalPlaylist,
	useDuplicatePlaylist,
	usePlaylistSync,
} from '@/hooks/mutations/db/playlist'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	usePlaylistContents,
	usePlaylistMetadata,
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
import { Alert, useWindowDimensions, View } from 'react-native'
import {
	Appbar,
	Button,
	Dialog,
	Divider,
	Menu,
	Portal,
	Text,
	TextInput,
	useTheme,
} from 'react-native-paper'
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

	useEffect(() => {
		if (playlistMetadata)
			setDuplicatePlaylistName(playlistMetadata.title + '-副本')
	}, [playlistMetadata])

	const { mutate: syncPlaylist } = usePlaylistSync()
	const { mutate: duplicatePlaylist } = useDuplicatePlaylist()
	const { mutate: deletePlaylist } = useDeletePlaylist()
	const { mutate: deleteTrackFromLocalPlaylist } =
		useDeleteTrackFromLocalPlaylist()

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
					setAddTrackModalVisible(true)
				},
			},
			{
				title: '删除歌曲',
				leadingIcon: 'delete',
				onPress: () => {
					deleteTrackFromLocalPlaylist({
						trackId: item.id,
						playlistId: Number(id),
					})
				},
			},
		],
		[deleteTrackFromLocalPlaylist, id, playNext],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			void playAll(track.uniqueKey)
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
				<Appbar.Action
					icon='dots-vertical'
					onPress={() => setFunctionalMenuVisible(true)}
				/>
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
							onClickCopyToLocalPlaylist={() =>
								setDuplicatePlaylistModalVisible(true)
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
			</View>

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
			<Portal>
				<Dialog
					visible={duplicatePlaylistModalVisible}
					onDismiss={() => setDuplicatePlaylistModalVisible(false)}
				>
					<Dialog.Title>复制播放列表</Dialog.Title>
					<Dialog.Content>
						<TextInput
							label='新播放列表名称'
							defaultValue={duplicatePlaylistName}
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
				</Dialog>
			</Portal>

			<Portal>
				<Menu
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
				</Menu>
			</Portal>
		</View>
	)
}
