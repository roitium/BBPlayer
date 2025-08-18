import { AnimatedModal } from '@/components/AnimatedModal'
import { useCreateNewLocalPlaylist } from '@/hooks/mutations/db/playlist'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Button, Dialog, IconButton, TextInput } from 'react-native-paper'

export default function CreatePlaylistModal({
	visiable,
	setVisible,
}: {
	visiable: boolean
	setVisible: (visible: boolean) => void
}) {
	const { mutate: createNewPlaylist } = useCreateNewLocalPlaylist()
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [coverUrl, setCoverUrl] = useState('')

	const handleConfirm = useCallback(() => {
		createNewPlaylist({
			title,
			description,
			coverUrl,
		})
		setVisible(false)
	}, [coverUrl, createNewPlaylist, description, setVisible, title])

	const handleImagePicker = useCallback(async () => {
		const result = await DocumentPicker.getDocumentAsync({
			type: 'image/*',
			copyToCacheDirectory: true,
			multiple: false,
		})
		if (result.canceled || result.assets.length === 0) return
		const asset = result.assets[0]
		const COVERS_DIR = FileSystem.documentDirectory + 'covers/'
		const dirInfo = await FileSystem.getInfoAsync(COVERS_DIR)
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true })
		}
		const fileInfo = await FileSystem.getInfoAsync(COVERS_DIR + asset.name)
		if (fileInfo.exists) {
			await FileSystem.deleteAsync(COVERS_DIR + asset.name)
		}
		await FileSystem.copyAsync({
			from: asset.uri,
			to: COVERS_DIR + asset.name,
		})
		setCoverUrl(COVERS_DIR + asset.name)
	}, [])

	return (
		<AnimatedModal
			visible={visiable}
			onDismiss={() => setVisible(false)}
		>
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
				<Button onPress={() => setVisible(false)}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
}
