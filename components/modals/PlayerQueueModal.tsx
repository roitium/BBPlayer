import useCurrentQueue from '@/hooks/playerHooks/useCurrentQueue'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import BottomSheet, {
	BottomSheetFlatList,
	BottomSheetFlatListMethods,
} from '@gorhom/bottom-sheet'
import { usePreventRemove } from '@react-navigation/native'
import {
	memo,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { View } from 'react-native'
import {
	IconButton,
	Surface,
	Text,
	TouchableRipple,
	useTheme,
} from 'react-native-paper'

const TrackItem = memo(
	({
		track,
		onSwitchTrack,
		onRemoveTrack,
		isCurrentTrack,
	}: {
		track: Track
		onSwitchTrack: (track: Track) => void
		onRemoveTrack: (track: Track) => void
		isCurrentTrack: boolean
	}) => {
		const colors = useTheme().colors
		return (
			<TouchableRipple onPress={() => onSwitchTrack(track)}>
				<Surface
					style={{
						backgroundColor: isCurrentTrack
							? colors.elevation.level5
							: undefined,
						overflow: 'hidden',
						borderRadius: 8,
					}}
					elevation={0}
				>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: 8,
							flex: 1,
						}}
					>
						<View
							style={{
								paddingRight: 0,
								flex: 1,
								marginLeft: 12,
								flexDirection: 'column',
							}}
						>
							<Text
								variant='bodyMedium'
								numberOfLines={1}
								style={{ fontWeight: 'bold' }}
							>
								{track.title || track.id}
							</Text>
							<Text
								variant='bodySmall'
								style={{ fontWeight: 'thin' }}
								numberOfLines={1}
							>
								{track.title || '待加载...'}
							</Text>
						</View>
						<IconButton
							icon='close-circle-outline'
							size={24}
							onPress={() => onRemoveTrack(track)}
						/>
					</View>
				</Surface>
			</TouchableRipple>
		)
	},
)

TrackItem.displayName = 'TrackItem'

function PlayerQueueModal({
	sheetRef,
}: {
	sheetRef: RefObject<BottomSheet | null>
}) {
	const queue = useCurrentQueue()
	const removeTrack = usePlayerStore((state) => state.removeTrack)
	const currentTrack = useCurrentTrack()
	const skipToTrack = usePlayerStore((state) => state.skipToTrack)
	const theme = useTheme()
	const [isVisible, setIsVisible] = useState(false)
	const [didInitialScroll, setDidInitialScroll] = useState(false)
	const flatListRef = useRef<BottomSheetFlatListMethods>(null)
	const currentIndex = useMemo(() => {
		if (!currentTrack || !queue.length) return -1
		// HACK: 基于 uniqueKey 的比较是否可靠？
		return queue.findIndex((t) => t.uniqueKey === currentTrack.uniqueKey)
	}, [queue, currentTrack])

	usePreventRemove(isVisible, () => {
		sheetRef.current?.close()
	})

	const switchTrackHandler = useCallback(
		(track: Track) => {
			const index = queue.findIndex((t) => t.uniqueKey === track.uniqueKey)
			if (index === -1) return
			skipToTrack(index)
		},
		[skipToTrack, queue],
	)

	const removeTrackHandler = useCallback(
		async (track: Track) => {
			// FIXME: remote playlist 预览时播放歌曲，id 为资源 aid 或 cid，是有概率与项目内主键 id 冲突的，或许考虑接受一个可选 uniqueKey 参数辅助过滤？
			await removeTrack(String(track.id))
		},
		[removeTrack],
	)

	const keyExtractor = useCallback((item: Track) => item.uniqueKey, [])

	const renderItem = useCallback(
		({ item }: { item: Track }) => (
			<TrackItem
				track={item}
				onSwitchTrack={switchTrackHandler}
				onRemoveTrack={removeTrackHandler}
				isCurrentTrack={item.uniqueKey === currentTrack?.uniqueKey}
			/>
		),
		[switchTrackHandler, removeTrackHandler, currentTrack],
	)

	useLayoutEffect(() => {
		// 当菜单被打开时，曲目改变不应该触发滚动。
		if (currentIndex !== -1 && isVisible && !didInitialScroll) {
			flatListRef.current?.scrollToIndex({
				animated: false,
				index: currentIndex,
				viewPosition: 0.5,
			})
			setDidInitialScroll(true)
		}
	}, [isVisible, currentIndex, didInitialScroll])

	return (
		<BottomSheet
			ref={sheetRef}
			index={-1}
			enableDynamicSizing={false}
			enablePanDownToClose={true}
			snapPoints={['75%']}
			onChange={(index) => {
				const isVisible = index !== -1
				setIsVisible(isVisible)
				if (!isVisible) {
					setDidInitialScroll(false)
				}
			}}
			backgroundStyle={{
				backgroundColor: theme.colors.elevation.level1,
			}}
			handleStyle={{
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.elevation.level5,
			}}
		>
			<BottomSheetFlatList
				data={queue}
				ref={flatListRef}
				keyExtractor={keyExtractor}
				getItemLayout={(_, index) => {
					return {
						length: 68,
						offset: 68 * index,
						index,
					}
				}}
				renderItem={renderItem}
				contentContainerStyle={{
					backgroundColor: theme.colors.elevation.level1,
				}}
			/>
		</BottomSheet>
	)
}

export default PlayerQueueModal
