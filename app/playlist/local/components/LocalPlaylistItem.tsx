import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Playlist, Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useCallback, useRef } from 'react'
import { Easing, View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { Checkbox, Icon, Surface, Text, useTheme } from 'react-native-paper'
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
	onMenuPress: (anchor: { x: number; y: number }) => void
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
	onMenuPress,
	showCoverImage = true,
	data,
	disabled = false,
	playlist,
	toggleSelected,
	isSelected,
	selectMode,
	enterSelectMode,
}: TrackListItemProps) {
	const theme = useTheme()
	const menuAnchorRef = useRef<View>(null)
	const isCurrentTrack = usePlayerStore(
		(state) => state.currentTrackUniqueKey === data.uniqueKey,
	)

	const highlighted = (isCurrentTrack && !selectMode) || isSelected

	const renderDownloadStatus = useCallback(() => {
		if (!data.trackDownloads) return null
		const { status } = data.trackDownloads
		const iconConfig = {
			downloaded: {
				source: 'check-circle-outline',
				color: theme.colors.primary,
			},
			failed: { source: 'alert-circle-outline', color: theme.colors.error },
		}[status] ?? {
			source: 'help-circle-outline',
			color: theme.colors.onSurfaceVariant,
		}

		return (
			<View style={{ paddingLeft: 4 }}>
				<Icon
					source={iconConfig.source}
					size={12}
					color={iconConfig.color}
				/>
			</View>
		)
	}, [data.trackDownloads, theme.colors])

	return (
		<RectButton
			style={{
				paddingVertical: 4,
				backgroundColor: highlighted
					? theme.colors.elevation.level5
					: 'transparent',
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
								style={{ color: theme.colors.onSurfaceVariant }}
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
							{/* 显示下载状态 */}
							{renderDownloadStatus()}
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
					{!disabled && (
						<View ref={menuAnchorRef}>
							<RectButton
								style={{ borderRadius: 99999, padding: 10 }}
								onPress={() => {
									menuAnchorRef.current?.measure(
										(_x, _y, _width, _height, pageX, pageY) => {
											onMenuPress({ x: pageX, y: pageY })
										},
									)
								}}
								enabled={!selectMode}
							>
								<Icon
									source='dots-vertical'
									size={20}
									color={
										selectMode
											? theme.colors.onSurfaceDisabled
											: theme.colors.primary
									}
								/>
							</RectButton>
						</View>
					)}
				</View>
			</Surface>
		</RectButton>
	)
})
