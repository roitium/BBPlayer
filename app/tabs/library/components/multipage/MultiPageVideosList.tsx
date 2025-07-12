import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useGetFavoritePlaylists,
	useInfiniteFavoriteList,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { Track } from '@/types/core/media'
import { LegendList } from '@legendapp/list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
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
	} = useGetFavoritePlaylists(userInfo?.mid)
	const {
		data: favoriteData,
		isError: isFavoriteDataError,
		isPending: isFavoriteDataPending,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteFavoriteList(
		playlists?.find((item) => item.title.startsWith('[mp]'))?.id,
	)

	const renderPlaylistItem = useCallback(
		({ item }: { item: Track }) => <MultiPageVideosItem item={item} />,
		[],
	)
	const keyExtractor = useCallback((item: Track) => item.id.toString(), [])

	const onRefresh = async () => {
		setRefreshing(true)
		await refetch()
		setRefreshing(false)
	}

	if (playlistsIsPending || isFavoriteDataPending) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator size='large' />
			</View>
		)
	}

	if (playlistsIsError || isFavoriteDataError) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text
					variant='titleMedium'
					style={{ textAlign: 'center' }}
				>
					加载失败
				</Text>
			</View>
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
					分P视频
				</Text>
				<Text variant='bodyMedium'>
					{favoriteData.pages[0]?.favoriteMeta?.media_count ?? 0} 个分P视频
				</Text>
			</View>
			<LegendList
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				data={favoriteData.pages.flatMap((page) => page.tracks) ?? []}
				renderItem={renderPlaylistItem}
				keyExtractor={keyExtractor}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
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
