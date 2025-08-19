import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
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
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const AnimatedTouchableOpacity =
	Animated.createAnimatedComponent(TouchableOpacity)

const NowPlayingBar = memo(function NowPlayingBar() {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const progress = usePlaybackProgress(100)
	const position = progress.position
	const duration = progress.duration || 1 // 保证不为 0
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const navigator =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const navigationState = useNavigationState((state) => state)
	const insets = useSafeAreaInsets()
	const [displayTrack, setDisplayTrack] = useState(currentTrack)

	// 延迟切换 track，避免在切换歌曲时因 currentTrack 短暂变为 null，导致重播入场动画效果
	useEffect(() => {
		let timer: string | number | NodeJS.Timeout | undefined
		if (currentTrack) {
			setDisplayTrack(currentTrack)
		} else {
			timer = setTimeout(() => setDisplayTrack(null), 150)
		}
		return () => clearTimeout(timer)
	}, [currentTrack])

	// 仅当不在播放器页且有歌曲在播放时，才显示 NowPlayingBar（应用冷启动时不知道为什么 routes 会是 undefined，所以需要用三元判断一下）
	const onTabView = navigationState
		? navigationState.routes[navigationState.index]?.name === 'MainTabs'
		: true
	const shouldShowNowPlayingBar =
		(navigationState
			? navigationState.routes[navigationState.index]?.name !== 'Player'
			: true) && !!displayTrack

	const marginBottom = useSharedValue(
		onTabView ? insets.bottom + 90 : insets.bottom + 10,
	)
	const translateY = useSharedValue(100)
	const opacity = useSharedValue(0)

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.get(),
			marginBottom: marginBottom.get(),
			transform: [{ translateY: translateY.get() }],
		}
	})

	useEffect(() => {
		marginBottom.set(
			withTiming(onTabView ? insets.bottom + 90 : insets.bottom + 10, {
				duration: 300,
			}),
		)
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [insets.bottom, onTabView])

	useEffect(() => {
		if (!shouldShowNowPlayingBar) return
		translateY.set(100)
		opacity.set(0)
		translateY.set(withTiming(0, { duration: 500 }))
		opacity.set(withTiming(1, { duration: 500 }))
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldShowNowPlayingBar])

	if (!shouldShowNowPlayingBar) return null

	return (
		<AnimatedTouchableOpacity
			onPress={() => {
				navigator.navigate('Player')
			}}
			activeOpacity={0.9}
			style={[
				{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: 24,
					marginHorizontal: 20,
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
				},
				animatedStyle,
			]}
		>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
				}}
			>
				<Image
					source={{ uri: displayTrack.coverUrl ?? undefined }}
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
						{displayTrack.title}
					</Text>
					<Text
						variant='bodySmall'
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{displayTrack.artist?.name ?? '未知'}
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
							void skipToPrevious()
						}}
						iconColor={colors.onSurface}
					/>
					<IconButton
						icon={isPlaying ? 'pause' : 'play'}
						size={24}
						onPress={(e) => {
							e.stopPropagation()
							void togglePlay()
						}}
						iconColor={colors.primary}
						style={{ marginHorizontal: 0 }}
					/>
					<IconButton
						icon='skip-next'
						size={16}
						onPress={(e) => {
							e.stopPropagation()
							void skipToNext()
						}}
						iconColor={colors.onSurface}
					/>
				</View>
			</View>
			<View
				style={{
					width: '83%',
					alignSelf: 'center',
					position: 'absolute',
					bottom: 0,
				}}
			>
				<ProgressBar
					animatedValue={position / duration}
					color={colors.primary}
					style={{ height: 0.8, backgroundColor: colors.elevation.level2 }}
				/>
			</View>
		</AnimatedTouchableOpacity>
	)
})

NowPlayingBar.displayName = 'NowPlayingBar'

export default NowPlayingBar
