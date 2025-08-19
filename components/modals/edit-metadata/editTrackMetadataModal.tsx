import { AnimatedModal } from '@/components/AnimatedModal'
import { useRenameTrack } from '@/hooks/mutations/db/track'
import type { Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { useEffect, useState } from 'react'
import { Button, Dialog, TextInput } from 'react-native-paper'

export default function EditTrackMetadataModal({
	track,
	visiable,
	setVisible,
}: {
	track: Track
	visiable: boolean
	setVisible: (visible: boolean) => void
}) {
	const [title, setTitle] = useState<string>()

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
		setVisible(false)
	}

	useEffect(() => {
		setTitle(track.title)
	}, [track.title])

	return (
		<AnimatedModal
			visible={visiable}
			onDismiss={() => setVisible(false)}
		>
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
				<Button onPress={() => setVisible(false)}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
}
