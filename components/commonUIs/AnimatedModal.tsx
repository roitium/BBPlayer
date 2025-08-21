import { useCallback, useState, type PropsWithChildren } from 'react'
import type { ViewStyle } from 'react-native'
import { Modal, Pressable, StyleSheet } from 'react-native'
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
	const [showContent, setShowContent] = useState(false)

	const animatedStyles = useAnimatedStyle(() => ({
		transform: [{ translateY: -keyboard.height.value }],
	}))

	const onClose = useCallback(() => {
		setShowContent(false)
		onDismiss()
	}, [onDismiss])

	return (
		<Modal
			animationType='none'
			transparent
			visible={visible}
			onDismiss={onClose}
			onRequestClose={onClose}
			statusBarTranslucent
			navigationBarTranslucent
		>
			<Pressable
				style={styles.wrapper}
				onPress={onClose}
			>
				<Animated.View style={[animatedStyles]}>
					<Pressable
						style={[
							styles.content,
							{
								backgroundColor: theme.colors.surface,
								marginHorizontal: Math.max(insets.left, insets.right, 26),
								elevation: 24,
								borderRadius: 24,
								opacity: showContent ? 1 : 0,
							},
							contentStyle,
						]}
						onLayout={(e) => {
							// new arch issue: 第一次打开 Modal 时会有 FOUC 问题，采用这种方法 hack 一下
							setShowContent(
								e.nativeEvent.layout.height > 0 &&
									e.nativeEvent.layout.width > 0,
							)
						}}
						onPress={(e) => e.stopPropagation()}
					>
						{children}
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	content: {
		minHeight: '30%',
		paddingTop: 10,
	},
})
