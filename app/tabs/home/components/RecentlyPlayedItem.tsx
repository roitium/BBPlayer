import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/time'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Divider, IconButton, Menu, Surface, Text } from 'react-native-paper'

const homeLog = log.extend('HOME')

const RecentlyPlayedItem = memo(function RecentlyPlayedItem({
	item,
	setModalVisible: _setModalVisible,
	setCurrentModalBvid: _setCurrentModalBvid,
}: {
	item: Track
	setModalVisible: (visible: boolean) => void
	setCurrentModalBvid: (bvid: string) => void
}) {
	const [isMenuVisible, setMenuVisible] = useState(false)
	const _navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	const playSingleTrack = async (track: Track) => {
		try {
			await usePlayerStore.getState().addToQueue({
				tracks: [track],
				playNow: true,
				clearQueue: true,
				playNext: false,
			})
		} catch (error) {
			homeLog.error('播放单曲失败', error)
			toast.error('播放单曲失败', {
				description: error,
			})
		}
	}

	const playNext = async (track: Track) => {
		try {
			await usePlayerStore.getState().addToQueue({
				tracks: [track],
				playNow: false,
				clearQueue: false,
				playNext: true,
			})
			toast.success('添加到下一首播放成功')
		} catch (error) {
			homeLog.error('添加到队列失败', error)
			toast.error('添加到队列失败', {
				description: error,
			})
		}
	}

	const handleDismissMenu = () => setMenuVisible(false)
	const handleOpenMenu = () => setMenuVisible(true)

	return (
		<>
			<TouchableOpacity
				key={item.id}
				style={{ marginBottom: 8 }}
				onPress={() => playSingleTrack(item)}
			>
				<Surface
					style={{ overflow: 'hidden', borderRadius: 8 }}
					elevation={0}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<Image
							source={{ uri: item.coverUrl ?? undefined }}
							style={{ width: 48, height: 48, borderRadius: 4 }}
							transition={300}
							cachePolicy={'none'}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								numberOfLines={1}
							>
								{item.title}
							</Text>
							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<Text variant='bodySmall'>{item.artist?.name ?? '未知'}</Text>
								{item.duration != null && item.duration > 0 && (
									<>
										<Text
											style={{ marginHorizontal: 4 }}
											variant='bodySmall'
										>
											•
										</Text>
										<Text variant='bodySmall'>
											{formatDurationToHHMMSS(item.duration)}
										</Text>
									</>
								)}
							</View>
						</View>
						<Menu
							visible={isMenuVisible}
							onDismiss={handleDismissMenu}
							anchor={
								<IconButton
									icon='dots-vertical'
									size={24}
									onPress={handleOpenMenu}
								/>
							}
							anchorPosition='bottom'
						>
							<Menu.Item
								leadingIcon='play-circle-outline'
								onPress={() => {
									playSingleTrack(item).catch((error: unknown) => {
										homeLog.error('播放单曲失败', error)
										toast.error('播放单曲失败', {
											description: error,
										})
									})
									handleDismissMenu()
								}}
								title='立即播放'
							/>
							<Menu.Item
								leadingIcon='playlist-play'
								onPress={() => {
									playNext(item).catch((error: unknown) => {
										homeLog.error('添加到队列失败', error)
										toast.error('添加到队列失败', {
											description: error,
										})
									})
									handleDismissMenu()
								}}
								title='下一首播放'
							/>
							<Divider />
							{/* <Menu.Item
								leadingIcon='plus'
								onPress={() => {
									setModalVisible(true)
									setCurrentModalBvid(item.id)
									handleDismissMenu()
								}}
								title='添加到收藏夹'
							/>
							<Divider />
							<Menu.Item
								leadingIcon='eye-outline'
								onPress={() => {
									navigation.navigate('PlaylistMultipage', { bvid: item.id })
									handleDismissMenu()
								}}
								title='作为分P视频展示'
							/> */}
						</Menu>
					</View>
				</Surface>
			</TouchableOpacity>
		</>
	)
})

RecentlyPlayedItem.displayName = 'RecentlyPlayedItem'

export default RecentlyPlayedItem
