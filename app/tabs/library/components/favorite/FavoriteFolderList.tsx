import { useGetFavoritePlaylists } from '@/hooks/queries/bilibili/favorite'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useAppStore from '@/hooks/stores/useAppStore'
import type { BilibiliPlaylist } from '@/types/apis/bilibili'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { Searchbar, Text, useTheme } from 'react-native-paper'
import type { RootStackParamList } from '../../../../../types/navigation'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import TabDisable from '../shared/TabDisabled'
import FavoriteFolderListItem from './FavoriteFolderListItem'

const FavoriteFolderListComponent = memo(() => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const [query, setQuery] = useState('')
	const enable = useAppStore((state) => state.hasBilibiliCookie())

	const { data: userInfo } = usePersonalInformation()
	const {
		data: playlists,
		isPending: playlistsIsPending,
		isRefetching: playlistsIsRefetching,
		refetch,
		isError: playlistsIsError,
	} = useGetFavoritePlaylists(userInfo?.mid)

	const renderPlaylistItem = useCallback(
		({ item }: { item: BilibiliPlaylist }) => (
			<FavoriteFolderListItem item={item} />
		),
		[],
	)
	const keyExtractor = useCallback(
		(item: BilibiliPlaylist) => item.id.toString(),
		[],
	)

	const onRefresh = async () => {
		setRefreshing(true)
		await refetch()
		setRefreshing(false)
	}

	if (!enable) {
		return <TabDisable />
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
			<FlashList
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
