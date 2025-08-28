import { useSearchSuggestions } from '@/hooks/queries/bilibili/search'
import type { BilibiliSearchSuggestionItem } from '@/types/apis/bilibili'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, FlatList, Keyboard, View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { Divider, Text, useTheme } from 'react-native-paper'
import Animated, {
	Extrapolation,
	interpolate,
	runOnJS,
	useAnimatedKeyboard,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Layout = {
	x: number
	y: number
	width: number
	height: number
	pageX: number
	pageY: number
} | null

export interface SearchSuggestionsProps {
	query: string
	visible: boolean
	searchBarLayout?: Layout
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

export default function SearchSuggestions({
	query,
	visible,
	searchBarLayout = null,
	onSuggestionPress,
}: SearchSuggestionsProps) {
	const { colors } = useTheme()
	const windowHeight = Dimensions.get('window').height
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

	const { height: kbHeightShared } = useAnimatedKeyboard()
	const [kbHeight, setKbHeight] = useState<number>(0)

	useAnimatedReaction(
		() => kbHeightShared.value,
		(cur, prev) => {
			if (cur !== prev) {
				runOnJS(setKbHeight)(cur ?? 0)
			}
		},
		[kbHeightShared],
	)

	const height = useSharedValue(0)

	const [availableHeight, setAvailableHeight] = useState(0)

	useEffect(() => {
		const MARGIN_TOP = 12
		const MARGIN_BOTTOM = 12
		const top =
			(searchBarLayout?.pageY ?? searchBarLayout?.y ?? 0) +
			(searchBarLayout?.height ?? 0) +
			MARGIN_TOP
		const raw =
			windowHeight - top - kbHeight - insets.bottom - MARGIN_BOTTOM - MARGIN_TOP
		const maxHeight = windowHeight * 0.4
		const final = Math.max(0, Math.min(Math.round(raw), maxHeight))
		setAvailableHeight(final)
	}, [
		searchBarLayout?.pageY,
		searchBarLayout?.y,
		searchBarLayout?.height,
		kbHeight,
		windowHeight,
		insets.bottom,
	])

	useEffect(() => {
		const target = visible ? availableHeight : 0
		height.value = withTiming(target)
	}, [visible, availableHeight, height])

	const aStyle = useAnimatedStyle(() => {
		const h = height.value
		const opacity =
			h > 0 ? interpolate(h, [0, h], [0, 1], Extrapolation.CLAMP) : 0
		const translateY = interpolate(h, [0, h], [-8, 0], Extrapolation.CLAMP)
		return {
			height: h,
			opacity,
			transform: [{ translateY }],
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

	const left = searchBarLayout?.pageX ?? 16
	const top = (searchBarLayout?.y ?? 0) + (searchBarLayout?.height ?? 48) + 16
	const width = searchBarLayout?.width ?? Dimensions.get('window').width - 32

	return (
		<Animated.View
			pointerEvents={visible ? 'auto' : 'none'}
			style={[
				{
					position: 'absolute',
					left,
					top,
					width,
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
