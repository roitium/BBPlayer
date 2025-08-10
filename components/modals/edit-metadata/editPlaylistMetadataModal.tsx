import { AnimatedModal } from '@/components/modal'
import { useEditPlaylistMetadata } from '@/hooks/mutations/db/playlist'
import { bilibiliFacade } from '@/lib/facades/bilibili'
import type { Playlist } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Button, Dialog, TextInput } from 'react-native-paper'

const logger = log.extend(
	'Components/Modals/Edit-Metadata/EditPlaylistMetadataModal',
)

export default function EditPlaylistMetadataModal({
	playlist,
	visiable,
	setVisible,
}: {
	playlist: Playlist
	visiable: boolean
	setVisible: (visible: boolean) => void
}) {
	const { mutate: editPlaylistMetadata } = useEditPlaylistMetadata()
	const [title, setTitle] = useState(playlist.title)
	const [description, setDescription] = useState(playlist.description)
	const [coverUrl, setCoverUrl] = useState(playlist.coverUrl)

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
			toast.error('获取远程播放列表元数据失败', {
				description: flatErrorMessage(result.error),
			})
			logger.error('获取远程播放列表元数据失败', result.error)
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
		editPlaylistMetadata({
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
		<AnimatedModal
			visible={visiable}
			onDismiss={() => setVisible(false)}
		>
			<Dialog.Title>编辑信息</Dialog.Title>
			<Dialog.Content style={{ gap: 5 }}>
				<TextInput
					label='标题'
					value={title}
					onChangeText={setTitle}
					mode='outlined'
					numberOfLines={1}
					style={{ maxHeight: 200 }}
					textAlignVertical='top'
				/>
				<TextInput
					label='描述'
					onChangeText={setDescription}
					value={description ?? undefined}
					mode='outlined'
					numberOfLines={1}
					multiline
					style={{ maxHeight: 200 }}
					textAlignVertical='top'
				/>
				<TextInput
					label='封面'
					onChangeText={setCoverUrl}
					value={coverUrl ?? undefined}
					mode='outlined'
					numberOfLines={1}
					style={{ maxHeight: 200 }}
					textAlignVertical='top'
				/>
			</Dialog.Content>
			<Dialog.Actions style={{ justifyContent: 'space-between' }}>
				<Button onPress={fetchRemoteMetadata}>获取远程数据</Button>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Button onPress={() => setVisible(false)}>取消</Button>
					<Button onPress={handleConfirm}>确定</Button>
				</View>
			</Dialog.Actions>
		</AnimatedModal>
	)
}
