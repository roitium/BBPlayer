import { AnimatedModal } from '@/components/AnimatedModal'
import { useCreateNewLocalPlaylist } from '@/hooks/mutations/db/playlist'
import { useCallback, useState } from 'react'
import { Button, Dialog, TextInput } from 'react-native-paper'

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
				<TextInput
					label='封面'
					onChangeText={setCoverUrl}
					value={coverUrl ?? undefined}
					mode='outlined'
					numberOfLines={1}
					textAlignVertical='top'
				/>
			</Dialog.Content>
			<Dialog.Actions style={{ justifyContent: 'space-between' }}>
				<Button onPress={() => setVisible(false)}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
}
