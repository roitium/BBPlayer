import { useEditPlaylistMetadata } from '@/hooks/mutations/db/playlist'
import type { Playlist } from '@/types/core/media'
import { useCallback, useState } from 'react'
import { Button, Dialog, Portal, TextInput } from 'react-native-paper'

export default function EditPlaylistMetadataModal({
	playlist,
	visiable,
	setVisible,
}: {
	playlist: Playlist
	visiable: boolean
	setVisible: (visible: boolean) => void
}) {
	const { mutateAsync: editPlaylistMetadata } = useEditPlaylistMetadata()
	const [title, setTitle] = useState(playlist.title)
	const [description, setDescription] = useState(playlist.description)
	const [coverUrl, setCoverUrl] = useState(playlist.coverUrl)

	const handleConfirm = useCallback(async () => {
		await editPlaylistMetadata({
			playlistId: playlist.id,
			payload: {
				title,
				description: description ?? undefined,
				coverUrl: coverUrl ?? undefined,
			},
		})
		setVisible(false)
	}, [
		coverUrl,
		description,
		editPlaylistMetadata,
		playlist.id,
		setVisible,
		title,
	])

	return (
		<Portal>
			<Dialog
				visible={visiable}
				onDismiss={() => setVisible(false)}
			>
				<Dialog.Title>编辑信息</Dialog.Title>
				<Dialog.Content style={{ gap: 5 }}>
					<TextInput
						label='标题'
						defaultValue={playlist.title}
						onChangeText={setTitle}
						mode='outlined'
						numberOfLines={1}
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
					/>
					<TextInput
						label='描述'
						onChangeText={setDescription}
						defaultValue={playlist.description ?? undefined}
						mode='outlined'
						numberOfLines={1}
						multiline
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
					/>
					<TextInput
						label='封面'
						onChangeText={setCoverUrl}
						defaultValue={playlist.coverUrl ?? undefined}
						mode='outlined'
						numberOfLines={1}
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
					/>
				</Dialog.Content>
				<Dialog.Actions>
					<Button onPress={() => setVisible(false)}>取消</Button>
					<Button onPress={handleConfirm}>确定</Button>
				</Dialog.Actions>
			</Dialog>
		</Portal>
	)
}
