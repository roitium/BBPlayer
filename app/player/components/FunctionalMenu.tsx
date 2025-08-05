import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import { Divider, Menu } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

export function FunctionalMenu({
	menuVisible,
	setMenuVisible,
	screenWidth,
	viewMode,
	uploaderMid,
	setFavModalVisible,
}: {
	menuVisible: boolean
	setMenuVisible: (visible: boolean) => void
	screenWidth: number
	viewMode: string
	uploaderMid: number | undefined
	setFavModalVisible: (visible: boolean) => void
}) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()

	return (
		<Menu
			visible={menuVisible}
			onDismiss={() => setMenuVisible(false)}
			anchor={{ x: screenWidth - 24, y: insets.top + 24 }}
		>
			{currentTrack?.source === 'bilibili' && (
				<Menu.Item
					onPress={() => {
						setMenuVisible(false)
						setFavModalVisible(true)
					}}
					title='添加到 bilibili 收藏夹'
					leadingIcon='playlist-plus'
				/>
			)}
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					if (!uploaderMid) {
						toast.error('获取视频详细信息失败')
					} else {
						navigation.navigate('PlaylistUploader', {
							mid: String(uploaderMid),
						})
					}
				}}
				title='查看作者'
				leadingIcon='account-music'
			/>
			<Divider />
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					if (!currentTrack) return
					void WebBrowser.openBrowserAsync(
						`https://www.bilibili.com/video/${currentTrack.id}`,
					)
				}}
				title='查看原视频'
				leadingIcon='share-variant'
			/>
			<Menu.Item
				onPress={() => {
					toast.show('暂未实现')
					setMenuVisible(false)
				}}
				title={viewMode === 'cover' ? '显示歌词' : '显示封面'}
				leadingIcon={viewMode === 'cover' ? 'text' : 'image'}
			/>
		</Menu>
	)
}
