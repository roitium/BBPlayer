import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import type { Playlist, Track } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { useCallback } from 'react'
import { Divider, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { TrackMenuItem } from './LocalPlaylistItem'
import { TrackListItem } from './LocalPlaylistItem'

interface LocalTrackListProps {
	tracks: Track[]
	playlist: Playlist
	handleTrackPress: (track: Track) => void
	trackMenuItems: (track: Track) => TrackMenuItem[]
	selectMode: boolean
	selected: Set<number>
	toggle: (id: number) => void
	enterSelectMode: (id: number) => void
	ListHeaderComponent: Parameters<typeof FlashList>[0]['ListHeaderComponent']
}

export function LocalTrackList({
	tracks,
	playlist,
	handleTrackPress,
	trackMenuItems,
	selectMode,
	selected,
	toggle,
	enterSelectMode,
	ListHeaderComponent,
}: LocalTrackListProps) {
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()

	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => handleTrackPress(item)}
					menuItems={trackMenuItems(item)}
					disabled={
						item.source === 'bilibili' && !item.bilibiliMetadata.videoIsValid
					}
					data={item}
					playlist={playlist}
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[
			enterSelectMode,
			handleTrackPress,
			playlist,
			selectMode,
			selected,
			toggle,
			trackMenuItems,
		],
	)

	const keyExtractor = useCallback((item: Track) => String(item.id), [])

	return (
		<FlashList
			data={tracks}
			renderItem={renderItem}
			extraData={{ selectMode, selected }}
			ItemSeparatorComponent={() => <Divider />}
			ListHeaderComponent={ListHeaderComponent}
			keyExtractor={keyExtractor}
			contentContainerStyle={{
				paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
			}}
			showsVerticalScrollIndicator={false}
			ListFooterComponent={
				<Text
					variant='titleMedium'
					style={{
						textAlign: 'center',
						paddingTop: 10,
					}}
				>
					•
				</Text>
			}
		/>
	)
}
