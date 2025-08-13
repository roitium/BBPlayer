import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import {
	Checkbox,
	Divider,
	IconButton,
	Menu,
	Surface,
	Text,
	TouchableRipple,
} from 'react-native-paper'

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

export interface TrackNecessaryData {
	cover?: string
	artistCover?: string
	title: string
	duration: number
	id: number
	artistName?: string
}

interface TrackListItemProps {
	index: number
	onTrackPress: () => void
	menuItems: TrackMenuItem[]
	showCoverImage?: boolean
	data: TrackNecessaryData
	disabled?: boolean
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
	toggleSelected,
	isSelected,
	selectMode,
	enterSelectMode,
}: TrackListItemProps) {
	const [isMenuVisible, setIsMenuVisible] = useState(false)
	const openMenu = () => setIsMenuVisible(true)
	const closeMenu = () => setIsMenuVisible(false)

	return (
		<TouchableRipple
			style={{
				paddingVertical: 4,
			}}
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
					{/* Index Number */}
					{selectMode ? (
						<View style={{ marginRight: 8, width: 35 }}>
							<Checkbox status={isSelected ? 'checked' : 'unchecked'} />
						</View>
					) : (
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
					)}

					{/* Cover Image */}
					{showCoverImage ? (
						<Image
							source={{
								uri: data.cover ?? data.artistCover ?? undefined,
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
							{data.artistName && (
								<>
									<Text
										variant='bodySmall'
										numberOfLines={1}
									>
										{data.artistName ?? '未知'}
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
