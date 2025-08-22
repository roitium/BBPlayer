import type { Playlist, Track } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { useCallback } from 'react'
import { Divider, Text } from 'react-native-paper'
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
	bottomPadding: number
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
	bottomPadding,
}: LocalTrackListProps) {
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
				paddingBottom: bottomPadding,
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
