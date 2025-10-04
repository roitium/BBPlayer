import FunctionalMenu from '@/components/commonUIs/FunctionalMenu'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { Divider, Menu } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

export function PlayerFunctionalMenu({
	menuVisible,
	setMenuVisible,
	screenWidth,
	uploaderMid,
	track,
}: {
	menuVisible: boolean
	setMenuVisible: (visible: boolean) => void
	screenWidth: number
	uploaderMid: number | undefined
	track: Track
}) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()
	const openModal = useModalStore((state) => state.open)
	const download = useDownloadManagerStore((state) => state.queueDownloads)

	return (
		<FunctionalMenu
			visible={menuVisible}
			onDismiss={() => setMenuVisible(false)}
			anchor={{ x: screenWidth - 24, y: insets.top + 24 }}
		>
			{currentTrack?.source === 'bilibili' && (
				<Menu.Item
					onPress={() => {
						setMenuVisible(false)
						openModal('AddVideoToBilibiliFavorite', {
							bvid: currentTrack.bilibiliMetadata.bvid,
						})
					}}
					title='添加到 bilibili 收藏夹'
					leadingIcon='playlist-plus'
				/>
			)}
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					if (!currentTrack) return
					openModal('UpdateTrackLocalPlaylists', { track: currentTrack })
				}}
				title='添加到本地歌单'
				leadingIcon='playlist-plus'
			/>
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
					WebBrowser.openBrowserAsync(
						`https://www.bilibili.com/video/${currentTrack.id}`,
					).catch((e) => {
						void Clipboard.setStringAsync(
							`https://www.bilibili.com/video/${currentTrack.id}`,
						)
						toast.error('无法调用浏览器打开网页，已将链接复制到剪贴板', {
							description: String(e),
						})
					})
				}}
				title='查看原视频'
				leadingIcon='share-variant'
			/>
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					download([
						{
							uniqueKey: track.uniqueKey,
							title: track.title,
							coverUrl: track.coverUrl ?? undefined,
						},
					])
					toast.info('已添加到下载队列')
				}}
				title={
					track.trackDownloads?.status === 'downloaded'
						? '重新下载音频'
						: '下载音频'
				}
				leadingIcon='download'
			/>
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					if (!currentTrack) return
					openModal('ManualSearchLyrics', {
						uniqueKey: currentTrack.uniqueKey,
						initialQuery: currentTrack.title,
					})
				}}
				title='搜索歌词'
				leadingIcon='magnify'
			/>
		</FunctionalMenu>
	)
}
