import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import { usePlaylistSync } from '@/hooks/mutations/db/playlist'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useCollectionAllContents } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { bv2av } from '@/lib/api/bilibili/utils'
import type { BilibiliMediaItemInCollection } from '@/types/apis/bilibili'
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
import { Appbar, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const mapApiItemToViewTrack = (apiItem: BilibiliMediaItemInCollection) => {
	return {
		id: bv2av(apiItem.bvid),
		cid: apiItem.id,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.id,
			name: apiItem.upper.name,
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		source: 'bilibili', // 明确来源
		isMultiPage: false, // 合集里的视频不当作分P处理
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

const mapApiItemToTrack = (apiItem: BilibiliMediaItemInCollection): Track => {
	return {
		id: bv2av(apiItem.bvid),
		uniqueKey: `collection::${apiItem.bvid}`,
		source: 'bilibili',
		title: apiItem.title,
		artist: {
			id: 1145141919810, // FIXME: Don't ask me why, bro.
			name: apiItem.upper.name,
			signature: '你所热爱的，就是你的生活',
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
			avatarUrl: null,
			createdAt: new Date(apiItem.pubtime),
			updatedAt: new Date(apiItem.pubtime),
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		playHistory: [],
		createdAt: new Date(apiItem.pubtime),
		updatedAt: new Date(apiItem.pubtime),
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
	}
}

export default function CollectionPage() {
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistCollection'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistCollection'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const addToQueue = usePlayerStore((state) => state.addToQueue)

	const {
		data: collectionData,
		isPending: isCollectionDataPending,
		isError: isCollectionDataError,
		refetch,
	} = useCollectionAllContents(Number(id))
	const tracksForDisplay = useMemo(
		() => collectionData?.medias.map(mapApiItemToViewTrack) ?? [],
		[collectionData],
	)

	const handlePlayTrack = useCallback(
		(item: UITrack, playNext = false) => {
			if (!collectionData?.medias) return
			const apiItem = collectionData?.medias.find((m) => m.bvid === item.bvid)
			if (!apiItem) return
			const track = mapApiItemToTrack(apiItem)
			void addToQueue({
				tracks: [track],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue, collectionData?.medias],
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
		[handlePlayTrack, navigation],
	)

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					// HACK: 经过测试，这种做法并不会导致重渲染，但有没有更优雅的方式？比如新增一个 prop 传递 onTrackPress 需要的入参，然后在 TrackListItem 内部构造一个新的稳定的函数？
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

	const { mutateAsync: syncCollection } = usePlaylistSync()

	const handleSync = useCallback(async () => {
		toast.show('同步中...')
		setRefreshing(true)
		await syncCollection(
			{
				remoteSyncId: Number(id),
				type: 'collection',
			},
			{
				onSuccess: (id) => {
					if (!id) return
					navigation.replace('PlaylistLocal', { id: String(id) })
				},
			},
		)
		setRefreshing(false)
	}, [id, navigation, syncCollection])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isCollectionDataPending) {
		return <PlaylistLoading />
	}

	if (isCollectionDataError) {
		return (
			<PlaylistError
				text='加载收藏夹内容失败'
				onRetry={refetch}
			/>
		)
	}

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<Appbar.Header elevated>
				<Appbar.Content title={collectionData.info.title} />
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
					keyExtractor={keyExtractor}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						paddingTop: 0,
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={collectionData.info.cover}
							title={collectionData.info.title}
							subtitles={`${collectionData.info.upper.name} • ${collectionData.info.media_count} 首歌曲`}
							description={collectionData.info.intro}
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
						/>
					}
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
			</View>
		</View>
	)
}
