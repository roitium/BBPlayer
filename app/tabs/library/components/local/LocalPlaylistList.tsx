import { usePlaylistLists } from '@/hooks/queries/db/playlist'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import type { Playlist } from '@/types/core/media'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { IconButton, Text, useTheme } from 'react-native-paper'
import CreatePlaylistModal from '../../../../../components/modals/CreatePlaylistModal'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import LocalPlaylistItem from './LocalPlaylistItem'

const LocalPlaylistListComponent = memo(() => {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const [modalVisible, setModalVisible] = useState(false)

	const {
		data: playlists,
		isPending: playlistsIsPending,
		isRefetching: playlistsIsRefetching,
		refetch,
		isError: playlistsIsError,
	} = usePlaylistLists()

	const renderPlaylistItem = useCallback(
		({ item }: { item: Playlist }) => <LocalPlaylistItem item={item} />,
		[],
	)
	const keyExtractor = useCallback((item: Playlist) => item.id.toString(), [])

	const onRefresh = async () => {
		setRefreshing(true)
		await refetch()
		setRefreshing(false)
	}

	if (playlistsIsPending) {
		return <DataFetchingPending />
	}

	if (playlistsIsError) {
		return (
			<DataFetchingError
				text='加载失败'
				onRetry={() => onRefresh()}
			/>
		)
	}

	return (
		<View style={{ flex: 1, marginHorizontal: 16 }}>
			<View
				style={{
					marginBottom: 8,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='titleMedium'
					style={{ fontWeight: 'bold' }}
				>
					播放列表
				</Text>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Text variant='bodyMedium'>{playlists.length ?? 0} 个播放列表</Text>
					<IconButton
						icon='plus'
						size={20}
						onPress={() => {
							setModalVisible(true)
						}}
					/>
				</View>
			</View>
			<FlashList
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				data={playlists ?? []}
				renderItem={renderPlaylistItem}
				estimatedItemSize={81}
				refreshControl={
					<RefreshControl
						refreshing={refreshing || playlistsIsRefetching}
						onRefresh={onRefresh}
						colors={[colors.primary]}
						progressViewOffset={50}
					/>
				}
				keyExtractor={keyExtractor}
				ListFooterComponent={
					<Text
						variant='titleMedium'
						style={{ textAlign: 'center', paddingTop: 10 }}
					>
						•
					</Text>
				}
				ListEmptyComponent={
					<Text style={{ textAlign: 'center' }}>没有播放列表</Text>
				}
			/>

			<CreatePlaylistModal
				visiable={modalVisible}
				setVisible={setModalVisible}
			/>
		</View>
	)
})

LocalPlaylistListComponent.displayName = 'LocalPlaylistListComponent'

export default LocalPlaylistListComponent
