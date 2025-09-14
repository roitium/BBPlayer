import type { TrackMenuItem } from '@/app/playlist/local/components/LocalPlaylistItem'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Playlist, Track } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Clipboard from 'expo-clipboard'
import { useCallback } from 'react'

const SCOPE = 'UI.Playlist.Local.Menu'

interface LocalPlaylistMenuProps {
	deleteTrack: (trackId: number) => void
	openAddToPlaylistModal: (track: Track) => void
	openEditTrackModal: (track: Track) => void
	playlist: Playlist
}

export function useLocalPlaylistMenu({
	deleteTrack,
	openAddToPlaylistModal,
	openEditTrackModal,
	playlist,
}: LocalPlaylistMenuProps) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)

	const playNext = useCallback(
		async (track: Track) => {
			try {
				await addToQueue({
					tracks: [track],
					playNow: false,
					clearQueue: false,
					playNext: true,
				})
				toast.success('添加到下一首播放成功')
			} catch (error) {
				toastAndLogError('添加到队列失败', error, SCOPE)
			}
		},
		[addToQueue],
	)

	return useCallback(
		(item: Track): TrackMenuItem[] => {
			const menuItems: TrackMenuItem[] = [
				{
					title: '下一首播放',
					leadingIcon: 'skip-next-circle-outline',
					onPress: () => playNext(item),
				},
				{
					title: '添加到本地歌单',
					leadingIcon: 'playlist-plus',
					onPress: () => openAddToPlaylistModal(item),
				},
			]
			if (item.source === 'bilibili') {
				menuItems.push(
					{
						title: '查看详细信息',
						leadingIcon: 'file-document-outline',
						onPress: () =>
							navigation.navigate('PlaylistMultipage', {
								bvid: item.bilibiliMetadata.bvid,
							}),
					},
					{
						title: '查看 up 主作品',
						leadingIcon: 'account-music',
						onPress: () => {
							if (!item.artist?.remoteId) {
								return
							}
							navigation.navigate('PlaylistUploader', {
								mid: item.artist?.remoteId,
							})
						},
					},
				)
			}
			menuItems.push(
				{
					title: '复制封面链接',
					leadingIcon: 'link',
					onPress: () => {
						void Clipboard.setStringAsync(item.coverUrl ?? '')
						toast.success('已复制到剪贴板')
					},
				},
				{
					title: '改名',
					leadingIcon: 'pencil',
					onPress: () => openEditTrackModal(item),
				},
			)
			if (playlist?.type === 'local') {
				menuItems.push({
					title: '删除歌曲',
					leadingIcon: 'delete',
					onPress: () => deleteTrack(item.id),
					danger: true,
				})
			}
			return menuItems
		},
		[
			deleteTrack,
			navigation,
			playNext,
			playlist,
			openAddToPlaylistModal,
			openEditTrackModal,
		],
	)
}
