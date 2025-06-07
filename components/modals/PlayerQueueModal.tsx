import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { memo, type RefObject, useCallback } from 'react'
import { View } from 'react-native'
import {
	IconButton,
	Surface,
	Text,
	TouchableRipple,
	useTheme,
} from 'react-native-paper'
import useCurrentQueue from '@/hooks/playerHooks/useCurrentQueue'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import { isTargetTrack } from '@/utils/player'

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
								{track.artist || '待加载...'}
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

function PlayerQueueModal({ sheetRef }: { sheetRef: RefObject<BottomSheet> }) {
	const queue = useCurrentQueue()
	const removeTrack = usePlayerStore((state) => state.removeTrack)
	const currentTrack = useCurrentTrack()
	const skipToTrack = usePlayerStore((state) => state.skipToTrack)
	const theme = useTheme()

	const switchTrackHandler = useCallback(
		(track: Track) => {
			const index = queue.findIndex((t) =>
				isTargetTrack(t, track.id, track.cid),
			)
			if (index === -1) return
			skipToTrack(index)
		},
		[skipToTrack, queue],
	)

	const removeTrackHandler = useCallback(
		async (track: Track) => {
			await removeTrack(track.id, track.cid)
		},
		[removeTrack],
	)

	const keyExtractor = useCallback(
		(item: Track) => `${item.id}-${item.cid}`,
		[],
	)

	const renderItem = useCallback(
		({ item }: { item: Track }) => (
			<TrackItem
				track={item}
				onSwitchTrack={switchTrackHandler}
				onRemoveTrack={removeTrackHandler}
				isCurrentTrack={
					item.isMultiPage
						? item.cid === currentTrack?.cid
						: item.id === currentTrack?.id
				}
			/>
		),
		[switchTrackHandler, removeTrackHandler, currentTrack],
	)

	return (
		<BottomSheet
			ref={sheetRef}
			index={-1}
			enableDynamicSizing={false}
			enablePanDownToClose={true}
			snapPoints={['75%']}
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
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				contentContainerStyle={{
					backgroundColor: theme.colors.elevation.level1,
				}}
			/>
		</BottomSheet>
	)
}

export default PlayerQueueModal
