import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useCollectionAllContents } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { bv2av } from '@/lib/api/bilibili/utils'
import db from '@/lib/db/db'
import { Facade } from '@/lib/facades/facade'
import { artistService } from '@/lib/services/artistService'
import { playlistService } from '@/lib/services/playlistService'
import { trackService } from '@/lib/services/trackService'
import { BilibiliMediaItemInCollection } from '@/types/apis/bilibili'
import { Track } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
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
import { Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/COLLECTION')

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
		source: 'bilibili',
		title: apiItem.title,
		artist: {
			id: 1145141919810, // FIXME: Don't ask me why, bro.
			name: apiItem.upper.name,
			signature: '你所热爱的，就是你的生活',
			remoteId: apiItem.upper.mid.toString(),
			source: 'bilibili',
			avatarUrl: null,
			createdAt: apiItem.pubtime,
		},
		coverUrl: apiItem.cover,
		duration: apiItem.duration,
		playCountSequence: [],
		createdAt: apiItem.pubtime,
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPart: false,
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
			addToQueue({
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
					// FIXME: 这里使用箭头函数创建闭包，会不会导致引用不稳定而引发重渲染？
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

	const handleSync = async () => {
		const facade = new Facade(
			trackService,
			bilibiliApi,
			playlistService,
			artistService,
			db,
		)
		const result = await facade.syncCollection(Number(id))
		if (result.isErr()) {
			toast.error(flatErrorMessage(result.error))
			playlistLog.error(result.error)
			return
		}
		toast.success('同步成功')
		navigation.replace('PlaylistLocal', { id: String(result.value) })
	}

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
			<PlaylistAppBar />

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
