import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetFavoritePlaylists,
	useInfiniteFavoriteList,
} from '@/hooks/queries/bilibili/favorite'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import type { BilibiliFavoriteListContent } from '@/types/apis/bilibili'
import { LegendList } from '@legendapp/list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import MultiPageVideosItem from './MultiPageVideosItem'

const MultiPageVideosListComponent = memo(() => {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)

	const { data: userInfo } = usePersonalInformation()
	const {
		data: playlists,
		isPending: playlistsIsPending,
		isError: playlistsIsError,
		isRefetching: playlistsIsRefetching,
		refetch: refetchPlaylists,
	} = useGetFavoritePlaylists(userInfo?.mid)
	const {
		data: favoriteData,
		isError: isFavoriteDataError,
		isPending: isFavoriteDataPending,
		isRefetching: isFavoriteDataRefetching,
		fetchNextPage,
		refetch: refetchFavoriteData,
		hasNextPage,
	} = useInfiniteFavoriteList(
		playlists?.find((item) => item.title.startsWith('[mp]'))?.id,
	)

	const renderPlaylistItem = useCallback(
		({ item }: { item: BilibiliFavoriteListContent }) => (
			<MultiPageVideosItem item={item} />
		),
		[],
	)
	const keyExtractor = useCallback(
		(item: BilibiliFavoriteListContent) => item.bvid,
		[],
	)

	const onRefresh = async () => {
		setRefreshing(true)
		await Promise.all([refetchPlaylists(), refetchFavoriteData()])
		setRefreshing(false)
	}

	if (playlistsIsPending || isFavoriteDataPending) {
		return <DataFetchingPending />
	}

	if (playlistsIsError || isFavoriteDataError) {
		return (
			<DataFetchingError
				text='加载失败'
				onRetry={() => onRefresh()}
			/>
		)
	}

	if (!playlists?.find((item) => item.title.startsWith('[mp]'))) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text
					variant='titleMedium'
					style={{ textAlign: 'center' }}
				>
					未找到分 p 视频收藏夹，请先创建一个收藏夹，并以 [mp] 开头
				</Text>
			</View>
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
					分P视频
				</Text>
				<Text variant='bodyMedium'>
					{favoriteData.pages[0]?.info?.media_count ?? 0} 个分P视频
				</Text>
			</View>
			<LegendList
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				data={favoriteData.pages.flatMap((page) => page.medias) ?? []}
				renderItem={renderPlaylistItem}
				keyExtractor={keyExtractor}
				refreshControl={
					<RefreshControl
						refreshing={
							refreshing || playlistsIsRefetching || isFavoriteDataRefetching
						}
						onRefresh={onRefresh}
						colors={[colors.primary]}
						progressViewOffset={50}
					/>
				}
				ListEmptyComponent={
					<Text style={{ textAlign: 'center' }}>没有分P视频</Text>
				}
				onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
				ListFooterComponent={
					hasNextPage ? (
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'center',
								padding: 16,
							}}
						>
							<ActivityIndicator size='small' />
						</View>
					) : (
						<Text
							variant='titleMedium'
							style={{ textAlign: 'center', paddingTop: 10 }}
						>
							•
						</Text>
					)
				}
			/>
		</View>
	)
})

MultiPageVideosListComponent.displayName = 'MultiPageVideosListComponent'

export default MultiPageVideosListComponent
