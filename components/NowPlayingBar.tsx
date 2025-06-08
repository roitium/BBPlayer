import { useNavigation } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import {
	Image,
	TouchableOpacity as RNTouchableOpacity,
	View,
} from 'react-native'
import {
	IconButton,
	ProgressBar,
	Surface,
	Text,
	useTheme,
} from 'react-native-paper'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	usePlaybackProgress,
	usePlayerStore,
} from '@/hooks/stores/usePlayerStore'

export default function NowPlayingBar() {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const progress = usePlaybackProgress(100)
	const [internalProgressPosition, setInternalProgressPosition] = useState(0)
	const [internalProgressDuration, setInternalProgressDuration] = useState(1) // 避免除零
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const navigator = useNavigation()

	// biome-ignore lint/correctness/useExhaustiveDependencies: 当切歌时归零进度条，不需要 progress 作为 dep
	useEffect(() => {
		setInternalProgressPosition(0)
		setInternalProgressDuration(1)
	}, [currentTrack])

	useEffect(() => {
		setInternalProgressPosition(progress.position)
		setInternalProgressDuration(progress.duration)
	}, [progress.position, progress.duration])

	if (!currentTrack) return null

	return (
		<Surface
			style={{
				overflow: 'hidden',
				borderBottomWidth: 1,
				borderBottomColor: colors.elevation.level5,
			}}
			elevation={2}
		>
			<RNTouchableOpacity
				style={{ position: 'relative' }}
				onPress={() => {
					navigator.navigate('Player')
				}}
				activeOpacity={0.9}
			>
				<ProgressBar
					animatedValue={internalProgressPosition / internalProgressDuration}
					color={colors.primary}
					style={{ height: 2 }}
				/>

				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						padding: 8,
					}}
				>
					<Image
						source={{ uri: currentTrack.cover }}
						style={{ height: 48, width: 48, borderRadius: 6 }}
					/>

					<View
						style={{
							marginLeft: 12,
							flex: 1,
							justifyContent: 'center',
							marginRight: 8,
						}}
					>
						<Text
							variant='titleMedium'
							numberOfLines={1}
							style={{ color: colors.onSurface }}
						>
							{currentTrack?.title}
						</Text>
						<Text
							variant='bodySmall'
							numberOfLines={1}
							style={{ color: colors.onSurfaceVariant }}
						>
							{currentTrack?.artist}
						</Text>
					</View>

					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
						}}
					>
						<IconButton
							icon='skip-previous'
							size={24}
							onPress={(e) => {
								e.stopPropagation()
								skipToPrevious()
							}}
							iconColor={colors.onSurface}
						/>
						<IconButton
							icon={isPlaying ? 'pause' : 'play'}
							size={24}
							onPress={(e) => {
								e.stopPropagation()
								togglePlay()
							}}
							iconColor={colors.primary}
							style={{ marginHorizontal: 0 }}
						/>
						<IconButton
							icon='skip-next'
							size={24}
							onPress={(e) => {
								e.stopPropagation()
								skipToNext()
							}}
							iconColor={colors.onSurface}
						/>
					</View>
				</View>
			</RNTouchableOpacity>
		</Surface>
	)
}
