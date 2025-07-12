import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useGetFavoritePlaylists } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { Playlist } from '@/types/core/media'
import { LegendList } from '@legendapp/list'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Searchbar, Text, useTheme } from 'react-native-paper'
import type { RootStackParamList } from '../../../../../types/navigation'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import FavoriteFolderListItem from './FavoriteFolderListItem'

const FavoriteFolderListComponent = memo(() => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const [query, setQuery] = useState('')

	const { data: userInfo } = usePersonalInformation()
	const {
		data: playlists,
		isPending: playlistsIsPending,
		isRefetching: playlistsIsRefetching,
		refetch,
		isError: playlistsIsError,
	} = useGetFavoritePlaylists(userInfo?.mid)

	const renderPlaylistItem = useCallback(
		({ item }: { item: Playlist }) => <FavoriteFolderListItem item={item} />,
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

	const filteredPlaylists = playlists.filter(
		(item) => !item.title.startsWith('[mp]'),
	)

	return (
		<View style={{ flex: 1 }}>
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
					我的收藏夹
				</Text>
				<Text variant='bodyMedium'>{playlists.length ?? 0} 个收藏夹</Text>
			</View>
			<Searchbar
				placeholder='搜索我的收藏夹内容'
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
					navigation.navigate('SearchResultFav', { query })
				}}
			/>
			<LegendList
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				data={filteredPlaylists}
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
					<Text style={{ textAlign: 'center' }}>没有收藏夹</Text>
				}
			/>
		</View>
	)
})

FavoriteFolderListComponent.displayName = 'FavoriteFolderListComponent'

export default FavoriteFolderListComponent
