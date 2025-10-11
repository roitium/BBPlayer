import FunctionalMenu from '@/components/commonUIs/FunctionalMenu'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import type { Playlist, Track } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import { Divider, Menu, Text, useTheme } from 'react-native-paper'
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
	const theme = useTheme()

	const [menuState, setMenuState] = useState<{
		visible: boolean
		anchor: { x: number; y: number }
		track: Track | null
	}>({
		visible: false,
		anchor: { x: 0, y: 0 },
		track: null,
	})

	const handleMenuPress = useCallback(
		(track: Track, anchor: { x: number; y: number }) => {
			setMenuState({ visible: true, anchor, track })
		},
		[],
	)

	const handleDismissMenu = useCallback(() => {
		setMenuState((prev) => ({ ...prev, visible: false }))
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => handleTrackPress(item)}
					onMenuPress={(anchor) => {
						handleMenuPress(item, anchor)
					}}
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
			handleMenuPress,
		],
	)

	const keyExtractor = useCallback((item: Track) => String(item.id), [])

	return (
		<>
			<FlashList
				data={tracks}
				renderItem={renderItem}
				extraData={{ selectMode, selected }}
				ItemSeparatorComponent={() => <Divider />}
				ListHeaderComponent={ListHeaderComponent}
				keyExtractor={keyExtractor}
				contentContainerStyle={{
					pointerEvents: menuState.visible ? 'none' : 'auto',
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
			{menuState.track && (
				<FunctionalMenu
					visible={menuState.visible}
					onDismiss={handleDismissMenu}
					anchor={menuState.anchor}
					anchorPosition='bottom'
				>
					{trackMenuItems(menuState.track).map((menuItem) => (
						<Menu.Item
							key={menuItem.title}
							titleStyle={menuItem.danger ? { color: theme.colors.error } : {}}
							leadingIcon={menuItem.leadingIcon}
							onPress={() => {
								menuItem.onPress()
								handleDismissMenu()
							}}
							title={menuItem.title}
						/>
					))}
				</FunctionalMenu>
			)}
		</>
	)
}
