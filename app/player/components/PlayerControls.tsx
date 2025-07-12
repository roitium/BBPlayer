import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { View } from 'react-native'
import { IconButton, Tooltip, useTheme } from 'react-native-paper'
import { RepeatMode } from 'react-native-track-player'

export function PlayerControls({ onOpenQueue }: { onOpenQueue: () => void }) {
	const { colors } = useTheme()
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const toggleShuffleMode = usePlayerStore((state) => state.toggleShuffleMode)
	const toggleRepeatMode = usePlayerStore((state) => state.toggleRepeatMode)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const repeatMode = usePlayerStore((state) => state.repeatMode)
	const shuffleMode = usePlayerStore((state) => state.shuffleMode)

	return (
		<View>
			<View
				style={{
					marginTop: 24,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 40,
				}}
			>
				<IconButton
					icon='skip-previous'
					size={32}
					onPress={skipToPrevious}
				/>
				<IconButton
					icon={isPlaying ? 'pause' : 'play'}
					size={48}
					onPress={togglePlay}
					mode='contained'
				/>
				<IconButton
					icon='skip-next'
					size={32}
					onPress={skipToNext}
				/>
			</View>
			<View
				style={{
					marginTop: 12,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 32,
				}}
			>
				<Tooltip title='切换随机播放模式'>
					<IconButton
						icon={shuffleMode ? 'shuffle-variant' : 'shuffle-disabled'}
						size={24}
						iconColor={shuffleMode ? colors.primary : colors.onSurfaceVariant}
						onPress={toggleShuffleMode}
					/>
				</Tooltip>
				<Tooltip title='切换循环播放模式'>
					<IconButton
						icon={
							repeatMode === RepeatMode.Off
								? 'repeat-off'
								: repeatMode === RepeatMode.Track
									? 'repeat-once'
									: 'repeat'
						}
						size={24}
						iconColor={
							repeatMode !== RepeatMode.Off
								? colors.primary
								: colors.onSurfaceVariant
						}
						onPress={toggleRepeatMode}
					/>
				</Tooltip>
				<Tooltip title='打开播放列表'>
					<IconButton
						icon='format-list-bulleted'
						size={24}
						iconColor={colors.onSurfaceVariant}
						onPress={onOpenQueue}
					/>
				</Tooltip>
			</View>
		</View>
	)
}
