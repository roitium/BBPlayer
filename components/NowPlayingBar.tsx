import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	usePlaybackProgress,
	usePlayerStore,
} from '@/hooks/stores/usePlayerStore'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { memo, useEffect, useState } from 'react'
import { Image, TouchableOpacity, View } from 'react-native'
import { IconButton, ProgressBar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const NowPlayingBar = memo(function NowPlayingBar() {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const progress = usePlaybackProgress(100)
	const [internalProgressPosition, setInternalProgressPosition] = useState(0)
	const [internalProgressDuration, setInternalProgressDuration] = useState(1) // 避免除零
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const navigator =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const navigationState = useNavigationState((state) => state)
	const insets = useSafeAreaInsets()

	// 仅当不在播放器页且有歌曲在播放时，才显示 NowPlayingBar
	const onTabView = navigationState
		? navigationState.routes[navigationState.index]?.name === 'MainTabs'
		: true
	const shouldShowNowPlayingBar =
		(navigationState
			? navigationState.routes[navigationState.index]?.name !== 'Player'
			: false) && currentTrack

	useEffect(() => {
		setInternalProgressPosition(0)
		setInternalProgressDuration(1)
	}, [currentTrack])

	useEffect(() => {
		setInternalProgressPosition(progress.position)
		setInternalProgressDuration(progress.duration)
	}, [progress.position, progress.duration])

	if (!currentTrack || !shouldShowNowPlayingBar) return null

	return (
		<TouchableOpacity
			onPress={() => {
				navigator.navigate('Player')
			}}
			activeOpacity={0.9}
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 24,
				marginHorizontal: 20,
				marginBottom: onTabView ? insets.bottom + 90 : insets.bottom + 10,
				position: 'relative',
				height: 48,
				backgroundColor: colors.elevation.level2,
				shadowColor: '#000',
				shadowOffset: {
					width: 0,
					height: 3,
				},
				shadowOpacity: 0.29,
				shadowRadius: 4.65,

				elevation: 7,
			}}
		>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
				}}
			>
				<Image
					source={{ uri: currentTrack.cover }}
					style={{
						height: 48,
						width: 48,
						borderRadius: 24,
						borderWidth: 0.8,
						borderColor: colors.primary,
					}}
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
						variant='titleSmall'
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
						size={16}
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
						size={16}
						onPress={(e) => {
							e.stopPropagation()
							skipToNext()
						}}
						iconColor={colors.onSurface}
					/>
				</View>
			</View>
			<View
				style={{
					width: '85%',
					alignSelf: 'center',
					position: 'absolute',
					bottom: 0,
				}}
			>
				<ProgressBar
					animatedValue={internalProgressPosition / internalProgressDuration}
					color={colors.primary}
					style={{ height: 0.8, backgroundColor: colors.elevation.level2 }}
				/>
			</View>
		</TouchableOpacity>
	)
})

NowPlayingBar.displayName = 'NowPlayingBar'

export default NowPlayingBar
