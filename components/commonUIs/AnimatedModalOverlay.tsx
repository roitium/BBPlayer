import { useState } from 'react'
import type { ViewStyle } from 'react-native'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from 'react-native-paper'
import Animated, {
	useAnimatedKeyboard,
	useAnimatedStyle,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
	visible: boolean
	onDismiss: () => void
	children?: React.ReactNode
	contentStyle?: ViewStyle
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function AnimatedModalOverlay({
	visible,
	onDismiss,
	children,
	contentStyle,
}: Props) {
	const insets = useSafeAreaInsets()
	const keyboard = useAnimatedKeyboard()
	const theme = useTheme()
	const [showContent, setShowContent] = useState(false)

	const wrapperAvoiding = useAnimatedStyle(() => {
		const k = Math.max(0, keyboard.height.value - insets.bottom)
		return { paddingBottom: k }
	})

	if (!visible) return null

	return (
		<AnimatedPressable
			style={[styles.wrapper, wrapperAvoiding]}
			onPress={onDismiss}
		>
			<Pressable
				style={[
					styles.content,
					{
						backgroundColor: theme.colors.surface,
						marginHorizontal: Math.max(insets.left, insets.right, 26),
						elevation: 24,
						borderRadius: 24,
						opacity: showContent ? 1 : 0,
						maxHeight: '85%',
					},
					contentStyle,
				]}
				onLayout={(e) => {
					setShowContent(
						e.nativeEvent.layout.height > 0 && e.nativeEvent.layout.width > 0,
					)
				}}
				onPress={(e) => e.stopPropagation()}
			>
				{children}
			</Pressable>
		</AnimatedPressable>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
		zIndex: 1000,
	},
	content: {
		paddingTop: 10,
	},
})
