import { lyricsQueryKeys, useSmartFetchLyrics } from '@/hooks/queries/lyrics'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { queryClient } from '@/lib/config/queryClient'
import lyricService from '@/lib/services/lyricService'
import type { Track } from '@/types/core/media'
import type { LyricLine } from '@/types/player/lyrics'
import { toastAndLogError } from '@/utils/log'
import type { FlashListRef } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { LinearGradient } from 'expo-linear-gradient'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Dimensions, ScrollView, View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import {
	ActivityIndicator,
	Divider,
	Icon,
	Text,
	useTheme,
} from 'react-native-paper'
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from 'react-native-reanimated'
import useLyricSync from '../hooks/useLyricSync'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)
const AnimatedFlashList = Animated.createAnimatedComponent(
	FlashList,
) as typeof FlashList<LyricLine>

interface LyricsOffsetControlProps {
	visible: boolean
	anchor: { x: number; y: number; width: number; height: number } | null
	offset: number
	onChangeOffset: (delta: number) => void
	onClose: () => void
}

const { height: windowHeight } = Dimensions.get('window')

export const LyricsOffsetControl = memo(function LyricsOffsetControl({
	visible,
	anchor,
	offset,
	onChangeOffset,
	onClose,
}: LyricsOffsetControlProps) {
	const colors = useTheme().colors

	return (
		<View
			style={{
				position: 'absolute',
				left: anchor ? anchor.x : 0,
				top: anchor ? windowHeight - anchor.y - 60 : 0,
				backgroundColor: colors.elevation.level2,
				gap: 8,
				borderRadius: 12,
				elevation: 10,
				paddingHorizontal: 2,
				paddingVertical: 4,
				opacity: visible ? 1 : 0,
				pointerEvents: visible ? 'auto' : 'none',
				zIndex: 99999,
			}}
		>
			<RectButton
				style={{ borderRadius: 99999, padding: 10 }}
				onPress={() => onChangeOffset(0.5)}
			>
				<Icon
					source='arrow-up'
					size={20}
					color={colors.onSurface}
				/>
			</RectButton>
			<Text
				variant='titleSmall'
				style={{ color: colors.onSurface, textAlign: 'center' }}
			>
				{offset.toFixed(1)}s
			</Text>
			<RectButton
				style={{ borderRadius: 99999, padding: 10 }}
				onPress={() => onChangeOffset(-0.5)}
			>
				<Icon
					source='arrow-down'
					size={20}
					color={colors.onSurface}
				/>
			</RectButton>
			<Divider />
			<RectButton
				style={{ borderRadius: 99999, padding: 10 }}
				onPress={onClose}
			>
				<Icon
					source='check'
					size={20}
					color={colors.onSurface}
				/>
			</RectButton>
		</View>
	)
})

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
	const colors = useTheme().colors
	const flashListRef = useRef<FlashListRef<LyricLine>>(null)
	const seekTo = usePlayerStore((state) => state.seekTo)
	const [offsetMenuVisible, setOffsetMenuVisible] = useState(false)
	const [offsetMenuAnchor, setOffsetMenuAnchor] = useState<{
		x: number
		y: number
		width: number
		height: number
	} | null>(null)
	const offsetMenuAnchorRef = useRef<View>(null)
	const containerRef = useRef<View>(null)
	const scrollY = useSharedValue(0)
	const contentHeight = useSharedValue(0)
	const viewportHeight = useSharedValue(0)

	const { data: lyrics, isPending, isError, error } = useSmartFetchLyrics(track)
	const {
		currentLyricIndex,
		onUserScrollEnd,
		onUserScrollStart,
		handleJumpToLyric,
	} = useLyricSync(
		lyrics?.lyrics ?? [],
		flashListRef,
		seekTo,
		lyrics?.offset ?? 0,
	)

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (e) => {
			scrollY.value = e.contentOffset.y
			contentHeight.value = e.contentSize.height
			viewportHeight.value = e.layoutMeasurement.height
		},
	})

	// 我们不在本地创建 offset state，而是直接调用 queryClient 来更新 smartFetchLyrics 的缓存。当用户点击确认时，再保存到本地
	const handleChangeOffset = (delta: number) => {
		if (!lyrics) return
		const newOffset = (lyrics.offset ?? 0) + delta
		queryClient.setQueryData(
			lyricsQueryKeys.smartFetchLyrics(track.uniqueKey),
			() => {
				return {
					...lyrics,
					offset: newOffset,
				}
			},
		)
	}

	const handleCloseOffsetMenu = async () => {
		setOffsetMenuVisible(false)
		if (!lyrics) return
		const saveResult = await lyricService.saveLyricsToFile(
			{
				...lyrics,
				offset: lyrics.offset,
			},
			track.uniqueKey,
		)
		if (saveResult.isErr()) {
			toastAndLogError('保存歌词偏移量失败', saveResult.error, 'Lyrics')
			return
		}
		console.log('保存歌词偏移量成功:', lyrics.offset)
	}

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

	useLayoutEffect(() => {
		if (offsetMenuAnchorRef.current && containerRef.current) {
			offsetMenuAnchorRef.current.measureLayout(
				containerRef.current,
				(x, y, width, height) => {
					setOffsetMenuAnchor({ x, y, width, height })
				},
			)
		}
	}, [offsetMenuVisible])

	const topFadeAnimatedStyle = useAnimatedStyle(() => {
		return {
			opacity: interpolate(scrollY.value, [0, 60], [0, 1], Extrapolation.CLAMP),
		}
	})

	const bottomFadeAnimatedStyle = useAnimatedStyle(() => {
		// 初始化时默认显示
		if (
			scrollY.value === 0 &&
			viewportHeight.value === 0 &&
			contentHeight.value === 0
		) {
			return { opacity: 1 }
		}
		const distanceFromEnd =
			contentHeight.value - (scrollY.value + viewportHeight.value)
		if (distanceFromEnd <= 0) {
			return { opacity: 0 }
		}

		return {
			opacity: interpolate(
				distanceFromEnd,
				[0, 60],
				[0, 1],
				Extrapolation.CLAMP,
			),
		}
	})

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
					marginHorizontal: 30,
				}}
				contentContainerStyle={{
					justifyContent: 'center',
					alignItems: 'center',
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

	const renderLyrics = () => {
		if (!lyrics.lyrics) {
			return (
				<Animated.ScrollView
					contentContainerStyle={{
						justifyContent: 'center',
						alignItems: 'center',
					}}
					scrollEventThrottle={16}
					onScroll={scrollHandler}
				>
					<Text
						variant='bodyMedium'
						style={{ textAlign: 'center' }}
					>
						{lyrics.rawTranslatedLyrics ? '原始歌词：' : ''}
						{lyrics.rawOriginalLyrics}
						{lyrics.rawTranslatedLyrics
							? `\n\n翻译歌词：${lyrics.rawTranslatedLyrics}`
							: ''}
					</Text>
				</Animated.ScrollView>
			)
		}
		return (
			<AnimatedFlashList
				ref={flashListRef}
				data={lyrics.lyrics}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentContainerStyle={{
					justifyContent: 'center',
					pointerEvents: offsetMenuVisible ? 'none' : 'auto',
				}}
				showsVerticalScrollIndicator={false}
				onMomentumScrollEnd={onUserScrollEnd}
				onScrollEndDrag={onUserScrollEnd}
				onScrollBeginDrag={onUserScrollStart}
				scrollEventThrottle={16}
				onScroll={scrollHandler}
			/>
		)
	}

	return (
		<View
			style={{ flex: 1 }}
			ref={containerRef}
		>
			<View style={{ flex: 1, flexDirection: 'column' }}>
				{renderLyrics()}
				{/* 顶部渐变遮罩 */}
				<AnimatedLinearGradient
					colors={[colors.background, 'transparent']}
					style={[
						{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: 60,
						},
						topFadeAnimatedStyle,
					]}
					pointerEvents='none'
				/>

				{/* 底部渐变遮罩 */}
				<AnimatedLinearGradient
					colors={['transparent', colors.background]}
					style={[
						{
							position: 'absolute',
							bottom: 0,
							left: 0,
							right: 0,
							height: 60,
						},
						bottomFadeAnimatedStyle,
					]}
					pointerEvents='none'
				/>
			</View>

			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingHorizontal: 16,
				}}
			>
				<View style={{ flex: 1 }} />

				<RectButton
					onPress={onBackPress}
					style={{ borderRadius: 99999, padding: 10 }}
					enabled={!offsetMenuVisible}
				>
					<Text
						variant='titleSmall'
						style={{
							color: offsetMenuVisible
								? colors.onSurfaceDisabled
								: colors.primary,
							textAlign: 'center',
						}}
					>
						返回
					</Text>
				</RectButton>

				{/* 歌词偏移量调整显示按钮 */}
				<View style={{ flex: 1, alignItems: 'flex-end' }}>
					<View style={{ flex: 1, flexDirection: 'row' }}>
						<RectButton
							style={{ borderRadius: 99999, padding: 10 }}
							enabled={!offsetMenuVisible}
							onPress={() =>
								useModalStore
									.getState()
									.open('EditLyrics', { uniqueKey: track.uniqueKey, lyrics })
							}
						>
							<Icon
								source='pencil'
								size={20}
								color={
									offsetMenuVisible ? colors.onSurfaceDisabled : colors.primary
								}
							/>
						</RectButton>
						<RectButton
							style={{ borderRadius: 99999, padding: 10 }}
							// @ts-expect-error -- 不想管
							ref={offsetMenuAnchorRef}
							enabled={!offsetMenuVisible}
							onPress={() => setOffsetMenuVisible(true)}
						>
							<Icon
								source='swap-vertical-circle-outline'
								size={20}
								color={
									offsetMenuVisible ? colors.onSurfaceDisabled : colors.primary
								}
							/>
						</RectButton>
					</View>
				</View>
			</View>

			{/* 歌词偏移量调整面板 */}
			<LyricsOffsetControl
				visible={offsetMenuVisible}
				anchor={offsetMenuAnchor}
				offset={lyrics.offset ?? 0}
				onChangeOffset={handleChangeOffset}
				onClose={handleCloseOffsetMenu}
			/>
		</View>
	)
}
