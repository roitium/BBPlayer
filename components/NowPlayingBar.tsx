import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { useModalStore } from '@/hooks/stores/useModalStore'
import {
	usePlaybackProgress,
	usePlayerStore,
} from '@/hooks/stores/usePlayerStore'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { memo, useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import {
	Gesture,
	GestureDetector,
	RectButton,
} from 'react-native-gesture-handler'
import { Icon, ProgressBar, Text, useTheme } from 'react-native-paper'
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const navigationState = useNavigationState((state) => state)
	const insets = useSafeAreaInsets()
	const [displayTrack, setDisplayTrack] = useState(currentTrack)
	// new arch issue: 直接通过 shouldShowNowPlayingBar 来控制组件显示会导致当组件显示时，动画还没开始（useEffect 还没来得及触发），有一个闪烁，体验不好，所以这里再加一个 finalDisplayBar 状态来控制最终显示状态
	const [finalDisplayBar, setFinalDisplayBar] = useState(false)
	const hasModalOpened = useModalStore((state) => state.modals.length > 0)

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

	const prevTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) runOnJS(skipToPrevious)()
	})
	const playTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) runOnJS(togglePlay)()
	})
	const nextTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) runOnJS(skipToNext)()
	})
	const outerTap = Gesture.Tap()
		.enabled(!hasModalOpened)
		.requireExternalGestureToFail(prevTap, playTap, nextTap)
		.onBegin(() => {
			opacity.value = withTiming(0.7, { duration: 100 })
		})
		.onFinalize((_e, success) => {
			opacity.value = withTiming(1, { duration: 100 })

			if (success) {
				runOnJS(navigation.navigate)({ name: 'Player', params: undefined })
			}
		})

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
	}, [insets.bottom, marginBottom, onTabView])

	// 出场入场动画
	useEffect(() => {
		if (!shouldShowNowPlayingBar) {
			setFinalDisplayBar(false)
			return
		}

		setFinalDisplayBar(true)
		translateY.set(100)
		opacity.set(0)
		translateY.set(withTiming(0, { duration: 500 }))
		opacity.set(withTiming(1, { duration: 500 }))
	}, [opacity, shouldShowNowPlayingBar, translateY])

	if (!finalDisplayBar || displayTrack === null) return null

	return (
		<GestureDetector gesture={outerTap}>
			<Animated.View
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
						<GestureDetector gesture={prevTap}>
							<RectButton style={{ borderRadius: 99999, padding: 10 }}>
								<Icon
									source='skip-previous'
									size={16}
									color={colors.onSurface}
								/>
							</RectButton>
						</GestureDetector>

						<GestureDetector gesture={playTap}>
							<RectButton style={{ borderRadius: 99999, padding: 10 }}>
								<Icon
									source={isPlaying ? 'pause' : 'play'}
									size={24}
									color={colors.primary}
								/>
							</RectButton>
						</GestureDetector>

						<GestureDetector gesture={nextTap}>
							<RectButton style={{ borderRadius: 99999, padding: 10 }}>
								<Icon
									source='skip-next'
									size={16}
									color={colors.onSurface}
								/>
							</RectButton>
						</GestureDetector>
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
			</Animated.View>
		</GestureDetector>
	)
})

NowPlayingBar.displayName = 'NowPlayingBar'

export default NowPlayingBar
