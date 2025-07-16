import { formatDurationToHHMMSS } from '@/utils/times'
import Slider from '@react-native-community/slider'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { usePlayerSlider } from '../hooks/usePlayerSlider'

export function PlayerSlider() {
	const { colors } = useTheme()
	const {
		isSliderEnabled,
		currentSliderPosition,
		maxSliderValue,
		handleSlidingStart,
		handleSlidingChange,
		handleSlidingComplete,
		duration,
	} = usePlayerSlider()

	return (
		<View>
			<Slider
				style={{ width: '100%', height: 40 }}
				minimumValue={0}
				maximumValue={maxSliderValue}
				value={currentSliderPosition}
				minimumTrackTintColor={colors.primary}
				maximumTrackTintColor={colors.surfaceVariant}
				thumbTintColor={colors.primary}
				disabled={!isSliderEnabled}
				onSlidingStart={handleSlidingStart}
				onValueChange={handleSlidingChange}
				onSlidingComplete={handleSlidingComplete}
			/>
			<View
				style={{
					marginTop: -8,
					flexDirection: 'row',
					justifyContent: 'space-between',
					paddingHorizontal: 4,
				}}
			>
				<Text
					variant='bodySmall'
					style={{ color: colors.onSurfaceVariant }}
				>
					{formatDurationToHHMMSS(Math.trunc(currentSliderPosition))}
				</Text>
				<Text
					variant='bodySmall'
					style={{ color: colors.onSurfaceVariant }}
				>
					{formatDurationToHHMMSS(Math.trunc(isSliderEnabled ? duration : 0))}
				</Text>
			</View>
		</View>
	)
}
