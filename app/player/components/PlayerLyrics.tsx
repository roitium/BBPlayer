import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { LyricLine, ParsedLrc } from '@/types/player/lyrics'
import type { FlashListRef } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useRef } from 'react'
import { View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper'
import useLyricSync from '../hooks/useLyricSync'

const LyricLineItem = memo(function LyricLineItem({
	item,
	isHighlighted,
	jumpToThisLyric,
	index,
}: {
	item: LyricLine
	isHighlighted: boolean
	jumpToThisLyric: (index: number) => void
	index: number
}) {
	const colors = useTheme().colors
	return (
		<RectButton
			style={{
				flexDirection: 'column',
				alignItems: 'center',
				gap: 4,
				borderRadius: 16,
				paddingVertical: 8,
				marginHorizontal: 30,
			}}
			onPress={() => jumpToThisLyric(index)}
		>
			<Text
				variant='bodyMedium'
				style={{
					color: isHighlighted ? colors.primary : colors.onSurfaceDisabled,
					textAlign: 'center',
				}}
			>
				{item.text}
			</Text>
			{item.translation && (
				<Text
					variant='bodySmall'
					style={{
						color: isHighlighted ? colors.primary : colors.onSurfaceDisabled,
						textAlign: 'center',
					}}
				>
					{item.translation}
				</Text>
			)}
		</RectButton>
	)
})

export default function Lyrics({
	onBackPress,
	lyrics,
	isLoading,
}: {
	onBackPress: () => void
	lyrics?: ParsedLrc | string
	isLoading: boolean
}) {
	const flashListRef = useRef<FlashListRef<LyricLine>>(null)
	const seekTo = usePlayerStore((state) => state.seekTo)
	const { currentLyricIndex, handleManualScrolling, handleJumpToLyric } =
		useLyricSync(
			typeof lyrics === 'string' ? [] : (lyrics?.lyrics ?? []),
			flashListRef,
			seekTo,
		)

	const renderItem = useCallback(
		({ item, index }: { item: LyricLine; index: number }) => (
			<LyricLineItem
				item={item}
				isHighlighted={index === currentLyricIndex}
				index={index}
				jumpToThisLyric={handleJumpToLyric}
			/>
		),
		[currentLyricIndex, handleJumpToLyric],
	)

	const keyExtractor = useCallback(
		(item: LyricLine) => item.timestamp.toString(),
		[],
	)

	if (isLoading || lyrics === undefined) {
		return <ActivityIndicator size='large' />
	}

	if (typeof lyrics === 'string') {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text
					variant='bodyMedium'
					style={{ textAlign: 'center' }}
				>
					{lyrics}
				</Text>
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<FlashList
				ref={flashListRef}
				data={lyrics.lyrics}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentContainerStyle={{ justifyContent: 'center' }}
				showsVerticalScrollIndicator={false}
				onMomentumScrollEnd={handleManualScrolling}
				style={{ flex: 1 }}
			/>

			<Button
				mode='text'
				onPress={onBackPress}
				style={{ marginTop: 10, alignSelf: 'center', minWidth: 0 }}
				// contentStyle={{ padding: 10 }}
			>
				返回
			</Button>
		</View>
	)
}
