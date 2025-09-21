import { useEditPlaylistMetadata } from '@/hooks/mutations/db/playlist'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { bilibiliFacade } from '@/lib/facades/bilibili'
import type { Playlist } from '@/types/core/media'
import log, { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Button, Dialog, IconButton, TextInput } from 'react-native-paper'

const logger = log.extend('Components.EditPlaylistMetadataModal')

export default function EditPlaylistMetadataModal({
	playlist,
}: {
	playlist: Playlist
}) {
	const { mutate: editPlaylistMetadata } = useEditPlaylistMetadata()
	const [title, setTitle] = useState(playlist.title)
	const [description, setDescription] = useState(playlist.description)
	const [coverUrl, setCoverUrl] = useState(playlist.coverUrl)
	const _close = useModalStore((state) => state.close)
	const close = useCallback(() => _close('EditPlaylistMetadata'), [_close])

	const fetchRemoteMetadata = useCallback(async () => {
		if (!playlist.remoteSyncId) {
			toast.error('播放列表的 remoteSyncId 为空，无法获取远程数据')
			return
		}
		const result = await bilibiliFacade.fetchRemotePlaylistMetadata(
			playlist.remoteSyncId,
			playlist.type,
		)
		if (result.isErr()) {
			toastAndLogError(
				'获取远程播放列表元数据失败',
				result.error,
				'Components.EditPlaylistMetadataModal',
			)
			return
		}
		const metadata = result.value
		setTitle(metadata.title)
		setDescription(metadata.description)
		setCoverUrl(metadata.coverUrl)
		logger.debug('获取远程播放列表元数据成功', metadata)
		toast.success('获取远程播放列表元数据成功')
	}, [playlist.remoteSyncId, playlist.type])

	const handleConfirm = useCallback(() => {
		if (title.trim().length === 0) {
			toast.error('标题不能为空')
			return
		}
		editPlaylistMetadata({
			playlistId: playlist.id,
			payload: {
				title,
				description: description ?? undefined,
				coverUrl: coverUrl ?? undefined,
			},
		})
		close()
	}, [close, coverUrl, description, editPlaylistMetadata, playlist.id, title])

	const handleImagePicker = useCallback(async () => {
		const result = await DocumentPicker.getDocumentAsync({
			type: 'image/*',
			copyToCacheDirectory: true,
			multiple: false,
		})
		if (result.canceled || result.assets.length === 0) return
		const assetFile = new FileSystem.File(result.assets[0].uri)
		const coverDir = new FileSystem.Directory(
			FileSystem.Paths.document,
			'covers',
		)
		if (!coverDir.exists) {
			coverDir.create({ intermediates: true })
		}
		const coverFile = new FileSystem.File(coverDir, assetFile.name)
		if (coverFile.exists) {
			coverFile.delete()
		}
		assetFile.copy(coverFile)
		setCoverUrl(coverFile.uri)
	}, [])

	const handleDismiss = useCallback(() => {
		close()
		setTitle('')
		setDescription('')
		setCoverUrl('')
	}, [close])

	return (
		<>
			<Dialog.Title>编辑信息</Dialog.Title>
			<Dialog.Content style={{ gap: 5 }}>
				<TextInput
					label='标题'
					value={title}
					onChangeText={setTitle}
					mode='outlined'
					numberOfLines={1}
					textAlignVertical='top'
				/>
				<TextInput
					label='描述'
					onChangeText={setDescription}
					value={description ?? undefined}
					mode='outlined'
					multiline
					style={{ maxHeight: 150 }}
					textAlignVertical='top'
				/>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<TextInput
						label='封面'
						onChangeText={setCoverUrl}
						value={coverUrl ?? undefined}
						mode='outlined'
						numberOfLines={1}
						textAlignVertical='top'
						style={{ flex: 1 }}
					/>
					<IconButton
						icon='image-plus'
						size={20}
						style={{ marginTop: 13 }} // 让按钮看起来像居中
						onPress={handleImagePicker}
					/>
				</View>
			</Dialog.Content>
			<Dialog.Actions style={{ justifyContent: 'space-between' }}>
				{playlist.type !== 'local' ? (
					<Button onPress={fetchRemoteMetadata}>获取远程数据</Button>
				) : (
					<View />
				)}
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Button onPress={handleDismiss}>取消</Button>
					<Button onPress={handleConfirm}>确定</Button>
				</View>
			</Dialog.Actions>
		</>
	)
}
