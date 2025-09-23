import { useCreateNewLocalPlaylist } from '@/hooks/mutations/db/playlist'
import { useModalStore } from '@/hooks/stores/useModalStore'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Button, Dialog, IconButton, TextInput } from 'react-native-paper'

export default function CreatePlaylistModal({
	redirectToNewPlaylist,
}: {
	redirectToNewPlaylist?: boolean
}) {
	const { mutate: createNewPlaylist } = useCreateNewLocalPlaylist()
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [coverUrl, setCoverUrl] = useState('')
	const _close = useModalStore((state) => state.close)
	const closeAll = useModalStore((state) => state.closeAll)
	const close = useCallback(() => _close('CreatePlaylist'), [_close])
	const navigation = useNavigation()

	const handleConfirm = useCallback(() => {
		if (title.trim().length === 0) {
			toast.error('标题不能为空')
			return
		}
		createNewPlaylist(
			{
				title,
				description,
				coverUrl,
			},
			{
				onSuccess: (playlist) => {
					if (redirectToNewPlaylist) {
						closeAll()
						useModalStore.getState().doAfterModalHostClosed(() => {
							navigation.navigate('PlaylistLocal', { id: String(playlist.id) })
						})
					} else {
						closeAll()
					}
				},
			},
		)
	}, [
		closeAll,
		coverUrl,
		createNewPlaylist,
		description,
		navigation,
		redirectToNewPlaylist,
		title,
	])

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
			coverDir.create({ intermediates: true, idempotent: true })
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
			<Dialog.Title>创建播放列表</Dialog.Title>
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
			<Dialog.Actions>
				<Button onPress={handleDismiss}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</>
	)
}
