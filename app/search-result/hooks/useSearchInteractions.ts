import { TrackMenuItemDividerToken } from '@/components/playlist/PlaylistItem'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { BilibiliTrack } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { MULTIPAGE_VIDEO_KEYWORDS } from '../constants'

export function useSearchInteractions() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<
		BilibiliTrack | undefined
	>(undefined)

	const playTrack = useCallback(
		async (track: BilibiliTrack, playNext = false) => {
			if (
				MULTIPAGE_VIDEO_KEYWORDS.some((keyword) =>
					track.title?.includes(keyword),
				)
			) {
				navigation.navigate('PlaylistMultipage', {
					bvid: track.bilibiliMetadata.bvid,
				})
				return
			}
			await addToQueue({
				tracks: [track],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue, navigation],
	)

	const trackMenuItems = useCallback(
		(item: BilibiliTrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playTrack(item, true),
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: () => {
					navigation.navigate('PlaylistMultipage', {
						bvid: item.bilibiliMetadata.bvid,
					})
				},
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到播放列表',
				leadingIcon: 'plus',
				onPress: () => {
					setCurrentModalTrack(item)
					setModalVisible(true)
				},
			},
		],
		[navigation, playTrack],
	)

	return {
		modalVisible,
		setModalVisible,
		currentModalTrack,
		playTrack,
		trackMenuItems,
	}
}
