import { memo, useEffect, useRef, useState } from 'react'
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'

// 定义组件的 Props 类型
interface TextMarqueeProps {
	/** 要滚动的文本内容 */
	children: string
	/** 应用于文本的样式 */
	style?: StyleProp<TextStyle>
	/** 滚动速度，单位为 像素/秒 */
	speed?: number
	/** 动画开始前的延迟时间，单位为毫秒 */
	marqueeDelay?: number
	/** 循环滚动时，重复文本之间的间距 */
	repeatSpacer?: number
	/** 是否使用原生驱动, 默认为 true */
	useNativeDriver?: boolean
}

const MarqueeText_ = ({
	children,
	style,
	speed = 50,
	marqueeDelay = 1000,
	repeatSpacer = 50,
	useNativeDriver = true,
}: TextMarqueeProps) => {
	// State for storing widths
	const [containerWidth, setContainerWidth] = useState(0)
	const [textWidth, setTextWidth] = useState(0)

	// Animated value for translation
	const animatedValue = useRef(new Animated.Value(0)).current
	// Ref to hold the animation instance
	const animationRef = useRef<Animated.CompositeAnimation | null>(null)

	// --- Measurement Handlers ---

	/**
	 * 当容器布局完成时，记录其宽度
	 */
	const handleContainerLayout = (e: LayoutChangeEvent) => {
		console.log('handleContainerLayout', e.nativeEvent.layout.width)
		setContainerWidth(e.nativeEvent.layout.width)
	}

	/**
	 * 当文本布局完成时，记录其宽度
	 */
	const handleTextLayout = (e: LayoutChangeEvent) => {
		console.log('handleTextLayout', e.nativeEvent.layout.width)
		setTextWidth(e.nativeEvent.layout.width)
	}

	// --- Animation Effect ---

	useEffect(() => {
		// 在重新计算前，停止任何正在进行的动画并重置位置
		animationRef.current?.stop()
		animatedValue.setValue(0)

		// 仅当文本宽度大于容器宽度时才需要动画
		const shouldAnimate = true

		if (shouldAnimate) {
			// 基于速度计算动画总时长
			const duration = ((textWidth + repeatSpacer) * 1000) / speed

			// 创建一个循环动画
			animationRef.current = Animated.loop(
				Animated.timing(animatedValue, {
					toValue: -(textWidth + repeatSpacer), // 移动一个文本宽度 + 间距的距离
					duration,
					easing: Easing.linear, // 匀速滚动效果更佳
					useNativeDriver,
				}),
			)

			// 延迟一段时间后启动动画
			const timeout = setTimeout(() => {
				animationRef.current?.start()
			}, marqueeDelay)

			// 组件卸载或依赖更新时，执行清理操作
			return () => {
				clearTimeout(timeout)
				animationRef.current?.stop()
			}
		}
	}, [
		animatedValue,
		containerWidth,
		textWidth,
		speed,
		marqueeDelay,
		repeatSpacer,
		useNativeDriver,
		children, // 当文本内容变化时，重新触发此 effect
	])

	// 决定是否需要渲染第二个重复的文本以实现无缝滚动
	const isAnimationNeeded = textWidth > containerWidth

	return (
		<View
			style={styles.container}
			onLayout={handleContainerLayout}
		>
			<Animated.View
				style={[
					styles.textView,
					{ transform: [{ translateX: animatedValue }] },
				]}
			>
				<Text
					onLayout={handleTextLayout}
					style={style}
					numberOfLines={1}
				>
					{children}
				</Text>
				{/* 仅在需要滚动时渲染第二个文本 */}
				{isAnimationNeeded && (
					<Text style={[style, { paddingLeft: repeatSpacer }]}>{children}</Text>
				)}
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		overflow: 'hidden', // 关键样式：隐藏容器外的内容
	},
	textView: {
		flexDirection: 'row',
		width: 'auto', // 让内容的宽度决定此视图的宽度
	},
})

const MarqueeText = memo(MarqueeText_)

export default MarqueeText
