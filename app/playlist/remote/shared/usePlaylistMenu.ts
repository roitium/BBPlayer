import type { BilibiliTrack } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback } from 'react'

export function usePlaylistMenu(
	playTrack: (track: BilibiliTrack, playNext: boolean) => void,
	setCurrentModalTrack: (track: BilibiliTrack) => void,
	setModalVisible: (visible: boolean) => void,
) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	return useCallback(
		(item: BilibiliTrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'skip-next-circle-outline',
				onPress: () => playTrack(item, true),
			},
			{
				title: '添加到本地歌单',
				leadingIcon: 'playlist-plus',
				onPress: () => {
					setCurrentModalTrack(item)
					setModalVisible(true)
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
		[navigation, playTrack, setCurrentModalTrack, setModalVisible],
	)
}
