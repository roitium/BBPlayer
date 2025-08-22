import { AnimatedModal } from '@/components/commonUIs/AnimatedModal'
import FunctionalMenu from '@/components/commonUIs/FunctionalMenu'
import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import EditPlaylistMetadataModal from '@/components/modals/edit-metadata/editPlaylistMetadataModal'
import EditTrackMetadataModal from '@/components/modals/edit-metadata/editTrackMetadataModal'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import type { Playlist, Track } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import type { RefObject } from 'react'
import { useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Alert } from 'react-native'
import {
	Button,
	Dialog,
	Menu,
	Portal,
	TextInput,
	useTheme,
} from 'react-native-paper'

export interface LocalPlaylistOverlaysRef {
	showAddTrackToPlaylistModal: (track: Track) => void
	showEditPlaylistModal: () => void
	showDuplicatePlaylistModal: () => void
	showBatchAddTracksModal: () => void
	showEditTrackModal: (track: Track) => void
	showFunctionalMenu: (anchor: { x: number; y: number }) => void
}

interface LocalPlaylistOverlaysProps {
	playlist: Playlist
	onDuplicatePlaylist: (newName: string) => void
	onClickDeletePlaylist: () => void
	batchAddTracksModalPayloads: {
		track: CreateTrackPayload
		artist: CreateArtistPayload
	}[]
}

const LocalPlaylistOverlays = ({
	playlist,
	onDuplicatePlaylist,
	onClickDeletePlaylist,
	batchAddTracksModalPayloads,
	ref,
}: LocalPlaylistOverlaysProps & {
	ref: RefObject<LocalPlaylistOverlaysRef | null>
}) => {
	const { colors } = useTheme()

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
	const [functionalMenuAnchor, setFunctionalMenuAnchor] = useState({
		x: 0,
		y: 0,
	})
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [editTrackModalVisible, setEditTrackModalVisible] = useState(false)

	useEffect(() => {
		if (playlist) setDuplicatePlaylistName(playlist.title + '-副本')
	}, [playlist])

	const handleDuplicatePlaylist = useCallback(() => {
		onDuplicatePlaylist(duplicatePlaylistName)
		setDuplicatePlaylistModalVisible(false)
	}, [duplicatePlaylistName, onDuplicatePlaylist])

	useImperativeHandle(ref, () => ({
		showAddTrackToPlaylistModal: (track) => {
			setCurrentModalTrack(track)
			setAddTrackModalVisible(true)
		},
		showEditPlaylistModal: () => {
			setEditPlaylistModalVisible(true)
		},
		showDuplicatePlaylistModal: () => {
			setDuplicatePlaylistModalVisible(true)
		},
		showBatchAddTracksModal: () => {
			setBatchAddTracksModalVisible(true)
		},
		showEditTrackModal: (track) => {
			setCurrentModalTrack(track)
			setEditTrackModalVisible(true)
		},
		showFunctionalMenu: (anchor) => {
			setFunctionalMenuAnchor(anchor)
			setFunctionalMenuVisible(true)
		},
	}))

	return (
		<>
			{currentModalTrack && (
				<AddVideoToLocalPlaylistModal
					track={currentModalTrack}
					visible={addTrackModalVisible}
					setVisible={setAddTrackModalVisible}
				/>
			)}

			<EditPlaylistMetadataModal
				playlist={playlist}
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
					<Button onPress={handleDuplicatePlaylist}>确定</Button>
				</Dialog.Actions>
			</AnimatedModal>

			<Portal>
				<FunctionalMenu
					visible={functionalMenuVisible}
					onDismiss={() => setFunctionalMenuVisible(false)}
					anchor={functionalMenuAnchor}
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

			{playlist.type === 'local' && (
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
		</>
	)
}

export default LocalPlaylistOverlays
