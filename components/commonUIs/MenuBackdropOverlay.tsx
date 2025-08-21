// MenuBackdropOverlay.tsx
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Portal } from 'react-native-paper'
import { runOnJS } from 'react-native-reanimated'

export default function MenuBackdropOverlay({
	visible,
	onPressOutside,
}: {
	visible: boolean
	onPressOutside?: () => void
}) {
	const tap = Gesture.Tap().onEnd(() => {
		if (!onPressOutside) return
		runOnJS(onPressOutside)()
	})

	if (!visible) return null

	return (
		<Portal>
			<GestureDetector gesture={tap}>
				<View style={[StyleSheet.absoluteFill, styles.backdrop]} />
			</GestureDetector>
		</Portal>
	)
}

const styles = {
	backdrop: {
		backgroundColor: 'transparent',
		zIndex: 114,
		elevation: 114,
	},
}
