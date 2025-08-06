import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { usePlaylistLists } from '@/hooks/queries/db/usePlaylist'
import type { Playlist } from '@/types/core/media'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Searchbar, Text, useTheme } from 'react-native-paper'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import LocalPlaylistItem from './LocalPlaylistItem'

const LocalPlaylistListComponent = memo(() => {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const [query, setQuery] = useState('')

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
				<Text variant='bodyMedium'>{playlists.length ?? 0} 个播放列表</Text>
			</View>
			<Searchbar
				placeholder='搜索我的播放列表'
				value={query}
				mode='bar'
				inputStyle={{
					alignSelf: 'center',
				}}
				onChangeText={setQuery}
				style={{
					borderRadius: 9999,
					textAlign: 'center',
					height: 45,
					marginBottom: 20,
					marginTop: 10,
				}}
				onSubmitEditing={() => {
					setQuery('')
					// navigation.navigate('SearchResultFav', { query })
					toast.info('暂未实现')
				}}
			/>
			<LegendList
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				data={playlists ?? []}
				renderItem={renderPlaylistItem}
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
		</View>
	)
})

LocalPlaylistListComponent.displayName = 'LocalPlaylistListComponent'

export default LocalPlaylistListComponent
