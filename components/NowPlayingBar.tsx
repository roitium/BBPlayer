import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { AppState, View } from 'react-native'
import {
	Gesture,
	GestureDetector,
	RectButton,
} from 'react-native-gesture-handler'
import { Icon, Text, useTheme } from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer, { Event } from 'react-native-track-player'
import { scheduleOnRN } from 'react-native-worklets'

const ProgressBar = memo(function ProgressBar() {
	const sharedProgress = useSharedValue(0)
	const sharedDuration = useSharedValue(1)
	const isActive = useSharedValue(true)
	const sharedTrackViewWidth = useSharedValue(0)
	const trackViewRef = useRef<View>(null)
	const { colors } = useTheme()

	useEffect(() => {
		const appStateSubscription = AppState.addEventListener(
			'change',
			(nextAppState) => {
				isActive.value = nextAppState === 'active'
			},
		)
		// 这里使用事件监听而非 hook，因为 hook 内部实现使用了 useState，但咱们的目的是直接绕过 React rerender，直接触发 UI thread 的更新。
		const handler = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			(data) => {
				if (!isActive.value) return
				sharedProgress.set(data.position)
				sharedDuration.set(data.duration)
			},
		)

		return () => {
			handler.remove()
			appStateSubscription.remove()
		}
	}, [isActive, sharedDuration, sharedProgress])

	useEffect(() => {
		void TrackPlayer.getProgress().then((data) => {
			sharedProgress.set(data.position)
			sharedDuration.set(data.duration)
		})
	}, [sharedDuration, sharedProgress])

	const animatedStyle = useAnimatedStyle(() => {
		const progressRatio = Math.min(
			sharedProgress.value / Math.max(sharedDuration.value, 1),
			1,
		)
		// 靠 transform 实现滑动效果，避免掉 reflow
		return {
			transform: [
				{
					translateX: (progressRatio - 1) * sharedTrackViewWidth.value,
				},
			],
		}
	})

	useLayoutEffect(() => {
		trackViewRef.current?.measure((_x, _y, width) => {
			sharedTrackViewWidth.value = width
		})
	}, [sharedTrackViewWidth, trackViewRef])

	return (
		<View style={{ width: '100%' }}>
			<View
				ref={trackViewRef}
				style={{
					height: 0.8,
					backgroundColor: colors.elevation.level2,
					overflow: 'hidden',
					position: 'relative',
				}}
			>
				<Animated.View
					style={[
						animatedStyle,
						{
							height: 0.8,
							backgroundColor: colors.primary,
							position: 'absolute',
							left: 0,
							top: 0,
							bottom: 0,
							right: 0,
						},
					]}
				/>
			</View>
		</View>
	)
})

const NowPlayingBar = memo(function NowPlayingBar() {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const insets = useSafeAreaInsets()
	const opacity = useSharedValue(1)
	const isVisible = currentTrack !== null

	const prevTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) scheduleOnRN(skipToPrevious)
	})
	const playTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) scheduleOnRN(togglePlay)
	})
	const nextTap = Gesture.Tap().onEnd((_e, success) => {
		if (success) scheduleOnRN(skipToNext)
	})
	const outerTap = Gesture.Tap()
		.requireExternalGestureToFail(prevTap, playTap, nextTap)
		.onBegin(() => {
			opacity.value = withTiming(0.7, { duration: 100 })
		})
		.onFinalize((_e, success) => {
			opacity.value = withTiming(1, { duration: 100 })

			if (success) {
				scheduleOnRN(navigation.navigate, { name: 'Player', params: undefined })
			}
		})

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: opacity.get(),
		}
	})

	return (
		<View
			pointerEvents='box-none'
			style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
		>
			{isVisible && (
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
								marginBottom: insets.bottom + 10,
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
								source={{ uri: currentTrack.coverUrl ?? undefined }}
								style={{
									height: 48,
									width: 48,
									borderRadius: 24,
									borderWidth: 0.8,
									borderColor: colors.primary,
								}}
								cachePolicy={'memory'}
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
									{currentTrack.title}
								</Text>
								<Text
									variant='bodySmall'
									numberOfLines={1}
									style={{ color: colors.onSurfaceVariant }}
								>
									{currentTrack.artist?.name ?? '未知'}
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
							<ProgressBar />
						</View>
					</Animated.View>
				</GestureDetector>
			)}
		</View>
	)
})

NowPlayingBar.displayName = 'NowPlayingBar'

export default NowPlayingBar
