import { useRenameTrack } from '@/hooks/mutations/db/track'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { useCallback, useEffect, useState } from 'react'
import { Button, Dialog, TextInput } from 'react-native-paper'

export default function EditTrackMetadataModal({ track }: { track: Track }) {
	const [title, setTitle] = useState<string>()
	const _close = useModalStore((state) => state.close)
	const close = useCallback(() => _close('EditTrackMetadata'), [_close])

	const { mutate: editTrackMetadata } = useRenameTrack()

	const handleConfirm = () => {
		if (!title) {
			toast.error('「」不是标题！')
			return
		}
		editTrackMetadata({
			trackId: track.id,
			newTitle: title,
			source: track.source,
		})
		close()
	}

	useEffect(() => {
		setTitle(track.title)
	}, [track.title])

	const handleDismiss = () => {
		close()
		setTitle('')
	}

	return (
		<>
			<Dialog.Title>改名</Dialog.Title>
			<Dialog.Content style={{ gap: 5 }}>
				<TextInput
					label='标题'
					value={title}
					onChangeText={setTitle}
					mode='outlined'
					numberOfLines={1}
					textAlignVertical='top'
				/>
			</Dialog.Content>
			<Dialog.Actions>
				<Button onPress={handleDismiss}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</>
	)
}
