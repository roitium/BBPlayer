import { useSmartFetchLyrics } from '@/hooks/queries/lyrics'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import type { LyricLine } from '@/types/player/lyrics'
import type { FlashListRef } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useRef } from 'react'
import { ScrollView, View } from 'react-native'
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
	track,
}: {
	onBackPress: () => void
	track: Track
}) {
	const flashListRef = useRef<FlashListRef<LyricLine>>(null)
	const seekTo = usePlayerStore((state) => state.seekTo)

	const { data: lyrics, isPending, isError, error } = useSmartFetchLyrics(track)
	const {
		currentLyricIndex,
		onUserScrollEnd,
		onUserScrollStart,
		handleJumpToLyric,
	} = useLyricSync(lyrics?.lyrics ?? [], flashListRef, seekTo)

	const keyExtractor = useCallback(
		(item: LyricLine, index: number) => `${index}_${item.timestamp * 1000}`,
		[],
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

	if (isPending) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size={'large'} />
			</View>
		)
	}

	if (isError) {
		return (
			<ScrollView
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					marginHorizontal: 30,
				}}
			>
				<Text
					variant='bodyMedium'
					style={{ textAlign: 'center' }}
				>
					歌词加载失败：{error.message}
				</Text>
			</ScrollView>
		)
	}

	if (!lyrics.lyrics) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text
					variant='bodyMedium'
					style={{ textAlign: 'center' }}
				>
					{lyrics.raw}
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
				onMomentumScrollEnd={onUserScrollEnd}
				onScrollEndDrag={onUserScrollEnd}
				onScrollBeginDrag={onUserScrollStart}
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
