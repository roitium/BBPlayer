import FunctionalMenu from '@/components/FunctionalMenu'
import type { Playlist, Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { Easing, View } from 'react-native'
import {
	Checkbox,
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
	danger?: boolean
}

interface TrackListItemProps {
	index: number
	onTrackPress: () => void
	menuItems: TrackMenuItem[]
	showCoverImage?: boolean
	data: Track
	disabled?: boolean
	playlist: Playlist
	toggleSelected: (id: number) => void
	isSelected: boolean
	selectMode: boolean
	enterSelectMode: (id: number) => void
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
	toggleSelected,
	isSelected,
	selectMode,
	enterSelectMode,
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
			delayLongPress={500}
			disabled={disabled}
			onPress={(e) => {
				if (selectMode) {
					toggleSelected(data.id)
					return
				}
				e.stopPropagation()
				onTrackPress()
			}}
			onLongPress={(e) => {
				e.stopPropagation()
				if (selectMode) return
				enterSelectMode(data.id)
			}}
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
					{/* Index Number & Checkbox Container */}
					<View
						style={{
							width: 35,
							marginRight: 8,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{/* 始终渲染，或许能降低一点性能开销？ */}
						<View style={{ position: 'absolute', opacity: selectMode ? 1 : 0 }}>
							<Checkbox status={isSelected ? 'checked' : 'unchecked'} />
						</View>

						{/* 序号也是 */}
						<View style={{ opacity: selectMode ? 0 : 1 }}>
							<Text
								variant='bodyMedium'
								style={{ color: 'grey' }}
							>
								{index + 1}
							</Text>
						</View>
					</View>

					{/* Cover Image */}
					{showCoverImage ? (
						<Image
							source={{
								uri: data.coverUrl ?? data.artist?.avatarUrl ?? undefined,
							}}
							style={{ width: 45, height: 45, borderRadius: 4 }}
							cachePolicy={'memory'}
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
						<FunctionalMenu
							visible={isMenuVisible}
							onDismiss={closeMenu}
							anchor={
								<IconButton
									icon='dots-vertical'
									size={20}
									disabled={selectMode} // 在选择模式下不允许打开菜单
									onPress={openMenu}
								/>
							}
							anchorPosition='bottom'
						>
							{menuItems.map((menuItem) => (
								<Menu.Item
									key={menuItem.title}
									titleStyle={
										menuItem.danger ? { color: theme.colors.error } : {}
									}
									leadingIcon={menuItem.leadingIcon}
									onPress={() => {
										menuItem.onPress()
										closeMenu()
									}}
									title={menuItem.title}
								/>
							))}
						</FunctionalMenu>
					)}
				</View>
			</Surface>
		</TouchableRipple>
	)
})
