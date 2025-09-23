import { useDuplicatePlaylist } from '@/hooks/mutations/db/playlist'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Button, Dialog, TextInput } from 'react-native-paper'

export default function DuplicateLocalPlaylistModal({
	sourcePlaylistId,
	rawName,
}: {
	sourcePlaylistId: number
	rawName: string
}) {
	const [duplicatePlaylistName, setDuplicatePlaylistName] = useState(
		`${rawName}-副本`,
	)
	const { mutate: duplicatePlaylist } = useDuplicatePlaylist()
	const close = useModalStore((state) => state.close)
	const closeAll = useModalStore((state) => state.closeAll)
	const navigation = useNavigation()

	const handleDuplicatePlaylist = useCallback(() => {
		if (!duplicatePlaylistName) return
		duplicatePlaylist(
			{
				playlistId: Number(sourcePlaylistId),
				name: duplicatePlaylistName,
			},
			{
				onSuccess: (id) => {
					closeAll()
					useModalStore.getState().doAfterModalHostClosed(() => {
						navigation.navigate('PlaylistLocal', { id: String(id) })
					})
				},
			},
		)
	}, [
		duplicatePlaylistName,
		duplicatePlaylist,
		sourcePlaylistId,
		closeAll,
		navigation,
	])

	return (
		<>
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
				<Button onPress={() => close('DuplicateLocalPlaylist')}>取消</Button>
				<Button onPress={handleDuplicatePlaylist}>确定</Button>
			</Dialog.Actions>
		</>
	)
}
