import { formatDurationToHHMMSS } from '@/utils/time'
import Slider from '@react-native-community/slider'
import { useState } from 'react'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
	useAnimatedProps,
	useAnimatedReaction,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { usePlayerSlider } from '../hooks/usePlayerSlider'

const AnimatedSlider = Animated.createAnimatedComponent(Slider)

function TextWithAnimation({
	sharedPosition,
	sharedDuration,
}: {
	sharedPosition: SharedValue<number>
	sharedDuration: SharedValue<number>
}) {
	const { colors } = useTheme()
	const [duration, setDuration] = useState(0)
	const [position, setPosition] = useState(0)

	useAnimatedReaction(
		() => {
			const truncDuration = sharedDuration.value
				? Math.trunc(sharedDuration.value)
				: null

			const truncPosition = sharedPosition.value
				? Math.trunc(sharedPosition.value)
				: null
			return [truncDuration, truncPosition]
		},
		([duration, position], prev) => {
			if (!prev) {
				scheduleOnRN(setDuration, duration ?? 0)
				scheduleOnRN(setPosition, position ?? 0)
				return
			}
			if (duration !== null && duration !== prev[0]) {
				scheduleOnRN(setDuration, duration)
			}
			if (position !== null && position !== prev[1]) {
				scheduleOnRN(setPosition, position)
			}
		},
	)

	return (
		<>
			<Text
				variant='bodySmall'
				style={{ color: colors.onSurfaceVariant }}
			>
				{formatDurationToHHMMSS(Math.trunc(position))}
			</Text>
			<Text
				variant='bodySmall'
				style={{ color: colors.onSurfaceVariant }}
			>
				{formatDurationToHHMMSS(Math.trunc(duration ?? 0))}
			</Text>
		</>
	)
}

export function PlayerSlider() {
	const { colors } = useTheme()
	const {
		handleSlidingStart,
		handleSlidingComplete,
		sharedDuration,
		sharedPosition,
	} = usePlayerSlider()

	const animatedProps = useAnimatedProps(() => {
		return {
			value: sharedPosition.value,
			disabled: sharedDuration.value <= 0,
			maximumValue: Math.max(sharedDuration.value, 1),
		}
	})

	return (
		<View>
			<AnimatedSlider
				style={{ width: '100%', height: 40, zIndex: 0 }}
				minimumValue={0}
				minimumTrackTintColor={colors.primary}
				maximumTrackTintColor={colors.surfaceVariant}
				thumbTintColor={colors.primary}
				onSlidingStart={handleSlidingStart}
				onSlidingComplete={handleSlidingComplete}
				animatedProps={animatedProps}
			/>
			<View
				style={{
					marginTop: -8,
					flexDirection: 'row',
					justifyContent: 'space-between',
					paddingHorizontal: 4,
				}}
			>
				<TextWithAnimation
					sharedPosition={sharedPosition}
					sharedDuration={sharedDuration}
				/>
			</View>
		</View>
	)
}
