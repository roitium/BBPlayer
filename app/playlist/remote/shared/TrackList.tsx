import FunctionalMenu from '@/components/commonUIs/FunctionalMenu'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import type { BilibiliTrack } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import {
	ActivityIndicator,
	Divider,
	Menu,
	Text,
	useTheme,
} from 'react-native-paper'

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
	ListFooterComponent?: Parameters<typeof FlashList>[0]['ListFooterComponent']
	ListEmptyComponent?: Parameters<typeof FlashList>[0]['ListEmptyComponent']
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
	ListFooterComponent,
	ListEmptyComponent,
	refreshControl,
	onEndReached,
	hasNextPage,
	showItemCover,
}: TrackListProps) {
	const colors = useTheme().colors

	const [menuState, setMenuState] = useState<{
		visible: boolean
		anchor: { x: number; y: number }
		track: BilibiliTrack | null
	}>({
		visible: false,
		anchor: { x: 0, y: 0 },
		track: null,
	})

	const handleMenuPress = useCallback(
		(track: BilibiliTrack, anchor: { x: number; y: number }) => {
			setMenuState({ visible: true, anchor, track })
		},
		[],
	)

	const handleDismissMenu = useCallback(() => {
		setMenuState((prev) => ({ ...prev, visible: false }))
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: BilibiliTrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => playTrack(item)}
					onMenuPress={(anchor) => handleMenuPress(item, anchor)}
					showCoverImage={showItemCover ?? true}
					data={{
						cover: item.coverUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
						uniqueKey: item.uniqueKey,
					}}
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[
			playTrack,
			toggle,
			selected,
			selectMode,
			enterSelectMode,
			handleMenuPress,
			showItemCover,
		],
	)

	const keyExtractor = useCallback((item: BilibiliTrack) => {
		return String(item.id)
	}, [])

	return (
		<>
			<FlashList
				data={tracks}
				extraData={{ selectMode, selected }}
				renderItem={renderItem}
				ItemSeparatorComponent={() => <Divider />}
				ListHeaderComponent={ListHeaderComponent}
				refreshControl={refreshControl}
				keyExtractor={keyExtractor}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					// 实现一个在 menu 弹出时，列表不可触摸的效果
					pointerEvents: menuState.visible ? 'none' : 'auto',
				}}
				onEndReached={onEndReached}
				ListFooterComponent={
					ListFooterComponent ??
					(hasNextPage ? <ActivityIndicator size='small' /> : null)
				}
				ListEmptyComponent={
					ListEmptyComponent ?? (
						<Text
							style={{
								paddingVertical: 32,
								textAlign: 'center',
								color: colors.onSurfaceVariant,
							}}
						>
							什么都没找到哦~
						</Text>
					)
				}
			/>
			{menuState.track && (
				<FunctionalMenu
					visible={menuState.visible}
					onDismiss={handleDismissMenu}
					anchor={menuState.anchor}
					anchorPosition='bottom'
				>
					{trackMenuItems(menuState.track).map((item) => (
						<Menu.Item
							key={item.title}
							leadingIcon={item.leadingIcon}
							onPress={() => {
								item.onPress()
								handleDismissMenu()
							}}
							title={item.title}
						/>
					))}
				</FunctionalMenu>
			)}
		</>
	)
}
