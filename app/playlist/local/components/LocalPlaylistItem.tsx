import type { Playlist, Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { Easing, View } from 'react-native'
import {
	Divider,
	IconButton,
	Menu,
	Surface,
	Text,
	TouchableRipple,
	useTheme,
} from 'react-native-paper'
import TextTicker from 'react-native-text-ticker'

export interface TrackMenuItem {
	title: string
	leadingIcon: string
	onPress: () => void
}

export const TrackMenuItemDividerToken: TrackMenuItem = {
	title: 'divider',
	leadingIcon: '',
	onPress: () => void 0,
}

interface TrackListItemProps {
	index: number
	onTrackPress: () => void
	menuItems: TrackMenuItem[]
	showCoverImage?: boolean
	data: Track
	disabled?: boolean
	playlist: Playlist
}

/**
 * 可复用的播放列表项目组件。
 */
export const TrackListItem = memo(function TrackListItem({
	index,
	onTrackPress,
	menuItems,
	showCoverImage = true,
	data,
	disabled = false,
	playlist,
}: TrackListItemProps) {
	const [isMenuVisible, setIsMenuVisible] = useState(false)
	const openMenu = () => setIsMenuVisible(true)
	const closeMenu = () => setIsMenuVisible(false)
	const theme = useTheme()

	return (
		<TouchableRipple
			style={{
				paddingVertical: 4,
			}}
			disabled={disabled}
			onPress={onTrackPress}
		>
			<Surface
				style={{
					overflow: 'hidden',
					borderRadius: 8,
					backgroundColor: 'transparent',
				}}
				elevation={0}
			>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						paddingHorizontal: 8,
						paddingVertical: 6,
					}}
				>
					{/* Index Number */}
					<Text
						variant='bodyMedium'
						style={{
							width: 35,
							textAlign: 'center',
							marginRight: 8,
							color: 'grey',
						}}
					>
						{index + 1}
					</Text>

					{/* Cover Image */}
					{showCoverImage ? (
						<Image
							source={{
								uri: data.coverUrl ?? data.artist?.avatarUrl ?? undefined,
							}}
							style={{ width: 45, height: 45, borderRadius: 4 }}
							transition={300}
							cachePolicy={'none'}
						/>
					) : null}

					{/* Title and Details */}
					<View style={{ marginLeft: 12, flex: 1, marginRight: 4 }}>
						<Text variant='bodySmall'>{data.title}</Text>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								marginTop: 2,
							}}
						>
							{/* Display Artist if available */}
							{data.artist && (
								<>
									<Text
										variant='bodySmall'
										numberOfLines={1}
									>
										{data.artist.name ?? '未知'}
									</Text>
									<Text
										style={{ marginHorizontal: 4 }}
										variant='bodySmall'
									>
										•
									</Text>
								</>
							)}
							{/* Display Duration */}
							<Text variant='bodySmall'>
								{data.duration ? formatDurationToHHMMSS(data.duration) : ''}
							</Text>
						</View>
						{/* 显示主视频标题（如果是分 p） */}
						{data.source === 'bilibili' &&
							data.bilibiliMetadata.mainTrackTitle &&
							data.bilibiliMetadata.mainTrackTitle !== data.title &&
							playlist.type !== 'multi_page' && (
								<TextTicker
									style={{ ...theme.fonts.bodySmall }}
									loop
									animationType='scroll'
									duration={130 * data.bilibiliMetadata.mainTrackTitle.length}
									easing={Easing.linear}
								>
									{data.bilibiliMetadata.mainTrackTitle}
								</TextTicker>
							)}
					</View>

					{/* Context Menu */}
					{menuItems.length > 0 && !disabled && (
						<Menu
							visible={isMenuVisible}
							onDismiss={closeMenu}
							anchor={
								<IconButton
									icon='dots-vertical'
									size={20}
									onPress={openMenu}
								/>
							}
							anchorPosition='bottom'
						>
							{menuItems.map((menuItem, index) =>
								menuItem.title === 'divider' ? (
									<Divider key={`divider-${index}`} />
								) : (
									<Menu.Item
										key={menuItem.title}
										leadingIcon={menuItem.leadingIcon}
										onPress={() => {
											menuItem.onPress()
											closeMenu()
										}}
										title={menuItem.title}
									/>
								),
							)}
						</Menu>
					)}
				</View>
			</Surface>
		</TouchableRipple>
	)
})
