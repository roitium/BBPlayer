import { useModalStore } from '@/hooks/stores/useModalStore'
import type { BilibiliTrack } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback } from 'react'

export function usePlaylistMenu(
	playTrack: (track: BilibiliTrack, playNext: boolean) => void,
) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const openModal = useModalStore((state) => state.open)

	return useCallback(
		(item: BilibiliTrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'skip-next-circle-outline',
				onPress: () => playTrack(item, true),
			},
			{
				title: '查看详细信息',
				leadingIcon: 'file-document-outline',
				onPress: () => {
					const state = navigation.getState()
					if (state.routes[state.index].name === 'PlaylistMultipage') {
						toast.info('你已经在这里了，没法更深入了！')
						return
					}
					navigation.navigate('PlaylistMultipage', {
						bvid: item.bilibiliMetadata.bvid,
					})
				},
			},
			{
				title: '添加到本地歌单',
				leadingIcon: 'playlist-plus',
				onPress: () => {
					openModal('UpdateTrackLocalPlaylists', { track: item })
				},
			},
			{
				title: '查看 up 主作品',
				leadingIcon: 'account-music',
				onPress: () => {
					if (!item.artist?.remoteId) {
						toast.error('未找到 up 主信息')
						return
					}
					navigation.navigate('PlaylistUploader', {
						mid: item.artist?.remoteId,
					})
				},
			},
		],
		[navigation, openModal, playTrack],
	)
}
