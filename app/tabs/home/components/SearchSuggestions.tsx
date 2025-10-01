import { useSearchSuggestions } from '@/hooks/queries/bilibili/search'
import type { BilibiliSearchSuggestionItem } from '@/types/apis/bilibili'
import { useCallback, useEffect, useMemo } from 'react'
import { Dimensions, FlatList, Keyboard, View } from 'react-native'
import { useBottomTabBarHeight } from 'react-native-bottom-tabs'
import { RectButton } from 'react-native-gesture-handler'
import { Divider, Text, useTheme } from 'react-native-paper'
import type { AnimatedRef } from 'react-native-reanimated'
import Animated, {
	Easing,
	Extrapolation,
	interpolate,
	measure,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnUI } from 'react-native-worklets'

export interface SearchSuggestionsProps {
	query: string
	visible: boolean
	searchBarRef: AnimatedRef<View>
	onSuggestionPress: (q: string) => void
}

/**
 * 将带有 <em>...</em> 的字符串解析成若干段：
 * - 普通段 { text, emphasized: false }
 * - 强调段 { text, emphasized: true }
 */
function parseEmTags(text: string | undefined) {
	const s = String(text ?? '')
	const regex = /<em[^>]*>(.*?)<\/em>/gi
	const segments: { text: string; emphasized: boolean }[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = regex.exec(s)) !== null) {
		if (match.index > lastIndex) {
			segments.push({
				text: s.slice(lastIndex, match.index),
				emphasized: false,
			})
		}
		segments.push({ text: match[1], emphasized: true })
		lastIndex = regex.lastIndex
	}
	if (lastIndex < s.length) {
		segments.push({ text: s.slice(lastIndex), emphasized: false })
	}
	if (segments.length === 0) return [{ text: s, emphasized: false }]
	return segments
}

// 搜索建议组件的一些边距
const MARGIN_HORIZONTAL = 16
const MARGIN_TOP = 12
const MARGIN_BOTTOM = 12

export default function SearchSuggestions({
	query,
	visible,
	searchBarRef,
	onSuggestionPress,
}: SearchSuggestionsProps) {
	const { colors } = useTheme()
	const windowHeight = Dimensions.get('window').height
	const windowWidth = Dimensions.get('window').width
	const insets = useSafeAreaInsets()
	const { data: items } = useSearchSuggestions(query)
	const parsedItems = useMemo(() => {
		return (
			items?.map((item) => ({
				...item,
				_segments: parseEmTags(item.name),
			})) ?? []
		)
	}, [items])
	const tabBarHeight = useBottomTabBarHeight()

	const visibleShared = useSharedValue(0)
	const position = useDerivedValue(() => {
		const layout = measure(searchBarRef)
		const left = layout?.pageX ?? layout?.x ?? MARGIN_HORIZONTAL
		const top = (layout?.y ?? 0) + (layout?.height ?? 0) + MARGIN_TOP
		const width = layout?.width ?? windowWidth - MARGIN_HORIZONTAL * 2

		return { left, top, width }
	})
	const tabBarHeightShared = useSharedValue(tabBarHeight)

	useEffect(() => {
		scheduleOnUI(
			(visible: boolean, tabBarHeight: number) => {
				visibleShared.value = visible ? 1 : 0
				tabBarHeightShared.value = tabBarHeight
			},
			visible,
			tabBarHeight,
		)
	}, [tabBarHeight, tabBarHeightShared, visible, visibleShared])

	const targetHeight = useDerivedValue(() => {
		const raw =
			windowHeight -
			tabBarHeightShared.value -
			MARGIN_BOTTOM -
			MARGIN_TOP -
			position.value.top -
			insets.bottom -
			insets.top

		const maxHeight = windowHeight * 0.4
		const final = Math.max(0, Math.min(Math.round(raw), maxHeight))
		return visibleShared.value ? final : 0
	})

	const height = useDerivedValue(() => {
		return withTiming(targetHeight.value, {
			duration: 200,
			easing: Easing.out(Easing.quad),
		})
	})

	const aStyle = useAnimatedStyle(() => {
		const h = height.value
		const opacity =
			h > 0 ? interpolate(h, [0, h], [0, 1], Extrapolation.CLAMP) : 0
		const translateY = interpolate(h, [0, h], [-8, 0], Extrapolation.CLAMP)
		return {
			height: h,
			opacity,
			transform: [{ translateY }],
			left: position.value.left,
			top: position.value.top,
			width: position.value.width,
		}
	})

	const keyExtractor = useCallback(
		(item: BilibiliSearchSuggestionItem) => item.name,
		[],
	)

	const renderItem = useCallback(
		({
			item,
		}: {
			item: BilibiliSearchSuggestionItem & {
				_segments?: { text: string; emphasized: boolean }[]
			}
		}) => {
			return (
				<RectButton
					onPress={() => {
						Keyboard.dismiss()
						onSuggestionPress(item.value)
					}}
					style={{
						paddingVertical: 12,
						paddingHorizontal: 14,
						backgroundColor: colors.surface,
					}}
				>
					<Text
						numberOfLines={1}
						style={{ color: colors.onSurface }}
					>
						{(item._segments ?? [{ text: item.value, emphasized: false }]).map(
							(seg, i) => (
								<Text
									key={i}
									style={
										seg.emphasized
											? { fontWeight: 'bold', color: colors.primary }
											: undefined
									}
								>
									{seg.text}
								</Text>
							),
						)}
					</Text>
				</RectButton>
			)
		},
		[colors.onSurface, colors.primary, colors.surface, onSuggestionPress],
	)

	return (
		<Animated.View
			pointerEvents={visible ? 'auto' : 'none'}
			style={[
				{
					position: 'absolute',
					zIndex: 9999,
					borderRadius: 12,
					overflow: 'hidden',
					backgroundColor: colors.surface,
					shadowColor: '#000',
					shadowOpacity: 0.08,
					shadowRadius: 10,
					elevation: 6,
				},
				aStyle,
			]}
		>
			<View style={{ flex: 1 }}>
				<FlatList
					data={parsedItems ?? []}
					keyExtractor={keyExtractor}
					keyboardShouldPersistTaps='handled'
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
				/>
			</View>
		</Animated.View>
	)
}
