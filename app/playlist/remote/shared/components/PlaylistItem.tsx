import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useRef } from 'react'
import { View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { Checkbox, Icon, Surface, Text, useTheme } from 'react-native-paper'

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
	uniqueKey: string
}

interface TrackListItemProps {
	index: number
	onTrackPress: () => void
	onMenuPress: (anchor: { x: number; y: number }) => void
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
	onMenuPress,
	showCoverImage = true,
	data,
	disabled = false,
	toggleSelected,
	isSelected,
	selectMode,
	enterSelectMode,
}: TrackListItemProps) {
	const colors = useTheme().colors
	const menuRef = useRef<View>(null)
	const isCurrentTrack = usePlayerStore(
		(state) => state.currentTrackUniqueKey === data.uniqueKey,
	)

	// 在非选择模式下，当前播放歌曲高亮；在选择模式下，歌曲被选中时高亮
	const highlighted = (isCurrentTrack && !selectMode) || isSelected

	return (
		<RectButton
			style={{
				paddingVertical: 4,
				backgroundColor: highlighted ? colors.elevation.level5 : 'transparent',
			}}
			delayLongPress={500}
			enabled={!disabled}
			onPress={() => {
				if (selectMode) {
					toggleSelected(data.id)
					return
				}
				if (isCurrentTrack) return
				onTrackPress()
			}}
			onLongPress={() => {
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
								style={{ color: colors.onSurfaceVariant }}
							>
								{index + 1}
							</Text>
						</View>
					</View>

					{/* Cover Image */}
					{showCoverImage ? (
						<Image
							source={{
								uri: data.cover ?? data.artistCover ?? undefined,
							}}
							recyclingKey={data.uniqueKey}
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
					{!disabled && (
						<RectButton
							// @ts-expect-error -- 不理解
							ref={menuRef}
							style={{ borderRadius: 99999, padding: 10 }}
							onPress={() =>
								menuRef.current?.measure(
									(_x, _y, _width, _height, pageX, pageY) => {
										onMenuPress({ x: pageX, y: pageY })
									},
								)
							}
							enabled={!selectMode}
						>
							<Icon
								source='dots-vertical'
								size={20}
								color={selectMode ? colors.onSurfaceDisabled : colors.primary}
							/>
						</RectButton>
					)}
				</View>
			</Surface>
		</RectButton>
	)
})
