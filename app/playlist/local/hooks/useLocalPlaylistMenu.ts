import type { TrackMenuItem } from '@/app/playlist/local/components/LocalPlaylistItem'
import { alert } from '@/components/modals/AlertModal'
import { playlistKeys } from '@/hooks/queries/db/playlist'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { queryClient } from '@/lib/config/queryClient'
import { downloadService } from '@/lib/services/downloadService'
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
	const queueDownloads = useDownloadManagerStore(
		(state) => state.queueDownloads,
	)

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

	const menuFunctions = (item: Track): TrackMenuItem[] => {
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
				{
					title:
						item.trackDownloads?.status === 'downloaded'
							? '删除缓存'
							: '缓存音频',
					leadingIcon:
						item.trackDownloads?.status === 'downloaded'
							? 'delete-sweep'
							: 'download',
					onPress: async () => {
						if (item.trackDownloads?.status === 'downloaded') {
							const result = await downloadService.delete(item.uniqueKey)
							if (result.isErr()) {
								toastAndLogError('删除缓存失败', result.error, SCOPE)
								return
							}
							toast.success('删除缓存成功')
							await queryClient.invalidateQueries({
								queryKey: playlistKeys.playlistContents(playlist.id),
							})
							return
						}

						queueDownloads([
							{
								uniqueKey: item.uniqueKey,
								title: item.title,
								coverUrl: item.coverUrl ?? undefined,
							},
						])
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
				leadingIcon: 'playlist-remove',
				onPress: () =>
					alert(
						'确定？',
						'确定从列表中移除该歌曲？',
						[
							{
								text: '取消',
							},
							{
								text: '确定',
								onPress: () => deleteTrack(item.id),
							},
						],
						{
							cancelable: true,
						},
					),
				danger: true,
			})
		}
		return menuItems
	}

	return menuFunctions
}
