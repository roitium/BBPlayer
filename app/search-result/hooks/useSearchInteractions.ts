import { TrackMenuItemDividerToken } from '@/components/playlist/PlaylistItem'
import { MULTIPAGE_VIDEO_KEYWORDS } from '@/constants/search'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import type { RootStackParamList } from '../../../types/navigation'

const searchLog = log.extend('SEARCH/INTERACTIONS')

export function useSearchInteractions() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

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
				searchLog.sentry('添加到队列失败', error)
				toast.show('添加到队列失败')
			}
		},
		[addToQueue],
	)

	const onTrackPress = useCallback(
		async (track: Track) => {
			if (
				MULTIPAGE_VIDEO_KEYWORDS.some((keyword) =>
					track.title?.includes(keyword),
				)
			) {
				navigation.navigate('PlaylistMultipage', { bvid: track.id })
				return
			}
			try {
				await addToQueue({
					tracks: [track],
					playNow: true,
					clearQueue: false,
					playNext: false,
				})
			} catch (error) {
				searchLog.sentry('播放失败', error)
				toast.show('播放失败')
			}
		},
		[addToQueue, navigation],
	)

	const openAddToFavModal = useCallback((bvid: string) => {
		setCurrentModalBvid(bvid)
		setModalVisible(true)
	}, [])

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playNext(item),
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
				},
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => openAddToFavModal(item.id),
			},
		],
		[playNext, navigation, openAddToFavModal],
	)

	return {
		modalVisible,
		currentModalBvid,
		setModalVisible,
		onTrackPress,
		trackMenuItems,
	}
}
