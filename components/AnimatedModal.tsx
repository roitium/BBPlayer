import type { PropsWithChildren } from 'react'
import type { ViewStyle } from 'react-native'
import { Modal, StyleSheet, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import Animated, {
	useAnimatedKeyboard,
	useAnimatedStyle,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ModalProps {
	visible: boolean
	onDismiss: () => void
	contentStyle?: ViewStyle
}
type Props = PropsWithChildren<ModalProps>

export const AnimatedModal = ({
	visible,
	onDismiss,
	children,
	contentStyle,
}: Props) => {
	const insets = useSafeAreaInsets()
	const keyboard = useAnimatedKeyboard()
	const theme = useTheme()

	const animatedStyles = useAnimatedStyle(() => ({
		transform: [{ translateY: -keyboard.height.value }],
	}))

	return (
		<Modal
			animationType='fade'
			transparent={true}
			visible={visible}
			onDismiss={onDismiss}
			onRequestClose={onDismiss}
		>
			<View
				style={styles.wrapper}
				onTouchEnd={onDismiss}
			>
				<Animated.View style={[animatedStyles, styles.inner]}>
					<View
						style={[
							styles.content,
							{
								backgroundColor: theme.colors.surface,
								marginHorizontal: Math.max(insets.left, insets.right, 26),
								elevation: 24,
								borderRadius: 24,
							},
							contentStyle,
						]}
						onTouchEnd={(e) => e.stopPropagation()}
					>
						{children}
					</View>
				</Animated.View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		position: 'absolute',
		bottom: 0,
		top: 0,
		left: 0,
		right: 0,
	},
	inner: {
		width: '100%',
		height: '100%',
		backgroundColor: 'rgba(0,0,0,0.32)',
	},
	content: {
		minHeight: '30%',
		paddingTop: 10,
		marginVertical: 'auto',
	},
})
