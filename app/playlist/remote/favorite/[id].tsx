import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useInfiniteFavoriteList } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePlaylistSync } from '@/hooks/queries/db/usePlaylist'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { bv2av } from '@/lib/api/bilibili/utils'
import type { BilibiliFavoriteListContent } from '@/types/apis/bilibili'
import type { Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import {
	ActivityIndicator,
	Appbar,
	Divider,
	Text,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const mapApiItemToViewTrack = (apiItem: BilibiliFavoriteListContent) => {
	return {
		id: bv2av(apiItem.bvid), // 仅仅用于列表的 key，不会作为真实 id 传递
		cid: apiItem.id,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.id,
			name: apiItem.upper.name,
			source: 'bilibili',
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		source: 'bilibili', // 明确来源
		isMultiPage: false, // 收藏夹里的视频不当作分P处理
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

const mapApiItemToTrack = (apiItem: BilibiliFavoriteListContent): Track => {
	return {
		id: bv2av(apiItem.bvid),
		uniqueKey: `favorite::${apiItem.bvid}`,
		source: 'bilibili',
		title: apiItem.title,
		artist: {
			id: 1145141919810, // FIXME: Don't ask me why, bro.
			name: apiItem.upper.name,
			signature: '你所热爱的，就是你的生活',
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
			avatarUrl: null,
			createdAt: new Date(apiItem.pubdate),
			updatedAt: new Date(apiItem.pubdate),
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		playHistory: [],
		createdAt: new Date(apiItem.pubdate),
		updatedAt: new Date(apiItem.pubdate),
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
	}
}

export default function FavoritePage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistFavorite'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistFavorite'>
		>()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const addToQueue = usePlayerStore((state) => state.addToQueue)

	const {
		data: favoriteData,
		isPending: isFavoriteDataPending,
		isError: isFavoriteDataError,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteFavoriteList(Number(id))
	const tracksForDisplay = useMemo(
		() =>
			favoriteData?.pages
				.flatMap((page) => page.medias)
				.map(mapApiItemToViewTrack) ?? [],
		[favoriteData],
	)

	const { mutateAsync: syncFavorite } = usePlaylistSync()

	const handlePlayTrack = useCallback(
		(item: UITrack, playNext = false) => {
			if (!favoriteData) return
			const apiItem = favoriteData.pages
				.flatMap((page) => page.medias)
				.find((m) => m.bvid === item.bvid)
			if (!apiItem) return
			const track = mapApiItemToTrack(apiItem)
			void addToQueue({
				tracks: [track],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue, favoriteData],
	)

	const trackMenuItems = useCallback(
		(item: UITrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => handlePlayTrack(item, true),
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.bvid })
				},
			},
		],
		[navigation, handlePlayTrack],
	)

	const handleSync = useCallback(async () => {
		if (favoriteData?.pages.flatMap((page) => page.medias).length === 0) {
			toast.info('收藏夹为空，无需同步')
			return
		}
		toast.show('同步中...')
		setRefreshing(true)
		await syncFavorite(
			{
				remoteSyncId: Number(id),
				type: 'favorite',
			},
			{
				onSuccess: (id) => {
					if (!id) return
					navigation.replace('PlaylistLocal', { id: String(id) })
				},
			},
		)
		setRefreshing(false)
	}, [favoriteData?.pages, id, navigation, syncFavorite])

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => handlePlayTrack(item)}
					menuItems={trackMenuItems(item)}
					data={{
						cover: item.coverUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
				/>
			)
		},
		[handlePlayTrack, trackMenuItems],
	)

	const keyExtractor = useCallback((item: UITrack) => item.bvid, [])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isFavoriteDataPending) {
		return <PlaylistLoading />
	}

	if (isFavoriteDataError) {
		return (
			<PlaylistError
				text='加载收藏夹内容失败'
				onRetry={refetch}
			/>
		)
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.Content title={favoriteData.pages[0].info.title} />
				<Appbar.BackAction onPress={() => navigation.goBack()} />
			</Appbar.Header>

			<View
				style={{
					flex: 1,
				}}
			>
				<LegendList
					data={tracksForDisplay}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={favoriteData.pages[0].info.cover}
							title={favoriteData.pages[0].info.title}
							subtitles={`${favoriteData.pages[0].info.upper.name} • ${favoriteData.pages[0].info.media_count} 首歌曲`}
							description={favoriteData.pages[0].info.intro}
							onClickMainButton={handleSync}
							mainButtonIcon={'sync'}
						/>
					}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)
								await refetch()
								setRefreshing(false)
							}}
							colors={[colors.primary]}
							progressViewOffset={50}
						/>
					}
					keyExtractor={keyExtractor}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					showsVerticalScrollIndicator={false}
					onEndReached={hasNextPage ? () => fetchNextPage() : null}
					ListEmptyComponent={
						<Text
							style={{
								paddingVertical: 32,
								textAlign: 'center',
							}}
							variant='titleMedium'
						>
							收藏夹为空
						</Text>
					}
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
								style={{
									textAlign: 'center',
									paddingTop: 10,
								}}
							>
								•
							</Text>
						)
					}
				/>
			</View>
		</View>
	)
}
