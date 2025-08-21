import { TrackListItem } from '@/components/playlist/PlaylistItem'
import type { BilibiliTrack } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { useCallback } from 'react'
import { ActivityIndicator, Divider } from 'react-native-paper'

interface TrackListProps {
	tracks: BilibiliTrack[]
	playTrack: (track: BilibiliTrack) => void
	trackMenuItems: (
		track: BilibiliTrack,
	) => { title: string; leadingIcon: string; onPress: () => void }[]
	selectMode: boolean
	selected: Set<number>
	toggle: (id: number) => void
	enterSelectMode: (id: number) => void
	ListHeaderComponent: Parameters<typeof FlashList>[0]['ListHeaderComponent']
	refreshControl: Parameters<typeof FlashList>[0]['refreshControl']
	onEndReached?: () => void
	hasNextPage?: boolean
	showItemCover?: boolean
}

export function TrackList({
	tracks,
	playTrack,
	trackMenuItems,
	selectMode,
	selected,
	toggle,
	enterSelectMode,
	ListHeaderComponent,
	refreshControl,
	onEndReached,
	hasNextPage,
	showItemCover,
}: TrackListProps) {
	const renderItem = useCallback(
		({ item, index }: { item: BilibiliTrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => playTrack(item)}
					menuItems={trackMenuItems(item)}
					showCoverImage={showItemCover ?? true}
					data={{
						cover: item.coverUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[playTrack, trackMenuItems, toggle, selected, selectMode, enterSelectMode],
	)

	const keyExtractor = useCallback((item: BilibiliTrack) => {
		return String(item.id)
	}, [])

	return (
		<FlashList
			data={tracks}
			extraData={{ selectMode, selected }}
			renderItem={renderItem}
			ItemSeparatorComponent={() => <Divider />}
			ListHeaderComponent={ListHeaderComponent}
			refreshControl={refreshControl}
			keyExtractor={keyExtractor}
			showsVerticalScrollIndicator={false}
			onEndReached={onEndReached}
			ListFooterComponent={
				hasNextPage ? <ActivityIndicator size='small' /> : null
			}
		/>
	)
}
