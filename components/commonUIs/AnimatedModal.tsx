import { useCallback, useState, type PropsWithChildren } from 'react'
import type { ViewStyle } from 'react-native'
import { Modal, Pressable, StyleSheet } from 'react-native' // 建议使用 Pressable 提高可访问性
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
			{/* 1. 使用 Pressable/View 作为根，并用 flex: 1 填充屏幕 */}
			<Pressable
				style={styles.wrapper}
				onPress={onClose}
			>
				{/* 2. 动画容器只包裹内容，这样背景不会移动 */}
				<Animated.View style={[animatedStyles]}>
					<Pressable // 使用 Pressable 并阻止事件冒泡
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
						onPress={(e) => e.stopPropagation()} // 阻止点击内容区域关闭 Modal
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
		flex: 1, // <--- 关键改动：使其填充整个屏幕，包括安全区域
		justifyContent: 'center', // <--- 垂直居中内容
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	// 'inner' 样式不再需要，Animated.View 现在只负责动画
	content: {
		minHeight: '30%',
		paddingTop: 10,
	},
})
