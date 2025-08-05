import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	usePlaylistContents,
	usePlaylistMetadata,
} from '@/hooks/queries/db/usePlaylist'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatRelativeTime } from '@/utils/time'
import toast from '@/utils/toast'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/LOCAL')

export default function LocalPlaylistPage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistLocal'>>()
	const { id } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistLocal'>
		>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()

	const {
		data: playlistData,
		isPending: isPlaylistDataPending,
		isError: isPlaylistDataError,
	} = usePlaylistContents(Number(id))

	const {
		data: playlistMetadata,
		isPending: isPlaylistMetadataPending,
		isError: isPlaylistMetadataError,
	} = usePlaylistMetadata(Number(id))

	const playNext = useCallback(
		async (track: Track) => {
			try {
				await addToQueue({
					tracks: [track],
					playNow: false,
					clearQueue: false,
					playNext: true,
				})
				toast.success('添加到下一首播放成功')
			} catch (error) {
				playlistLog.error('添加到队列失败', error)
				toast.error('添加到队列失败', {
					description: error,
				})
			}
		},
		[addToQueue],
	)

	const playAll = useCallback(
		async (startFromId?: string) => {
			try {
				if (!playlistData) return
				await addToQueue({
					tracks: playlistData,
					playNow: true,
					clearQueue: true,
					startFromId: startFromId,
					playNext: false,
				})
			} catch (error) {
				playlistLog.error('播放全部失败', error)
				toast.error('播放全部失败', {
					description: error,
				})
			}
		},
		[addToQueue, playlistData],
	)

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playNext(item),
			},
		],
		[playNext],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			void playAll(String(track.id))
		},
		[playAll],
	)

	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => handleTrackPress(item)}
					menuItems={trackMenuItems(item)}
					data={{
						cover: item.coverUrl ?? undefined,
						artistCover: item.artist?.avatarUrl ?? undefined,
						title: item.title,
						duration: item.duration,
						id: item.id,
						artistName: item.artist?.name,
					}}
				/>
			)
		},
		[handleTrackPress, trackMenuItems],
	)

	const keyExtractor = useCallback((item: Track) => String(item.id), [])

	useEffect(() => {
		if (typeof id !== 'string') {
			navigation.replace('NotFound')
		}
	}, [id, navigation])

	if (typeof id !== 'string') {
		return null
	}

	if (isPlaylistDataPending || isPlaylistMetadataPending) {
		return <PlaylistLoading />
	}

	if (isPlaylistDataError || isPlaylistMetadataError) {
		return <PlaylistError text='加载播放列表内容失败' />
	}

	if (!playlistMetadata) {
		return <PlaylistError text='未找到播放列表元数据' />
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<PlaylistAppBar />

			<View
				style={{
					flex: 1,
				}}
			>
				<LegendList
					data={playlistData}
					renderItem={renderItem}
					ItemSeparatorComponent={() => <Divider />}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={playlistMetadata.coverUrl as string | undefined}
							title={playlistMetadata.title}
							subtitles={[
								`${playlistMetadata.author?.name} • ${playlistMetadata.itemCount} 首歌曲`,
								`最后同步：${playlistMetadata.lastSyncedAt ? formatRelativeTime(playlistMetadata.lastSyncedAt) : '未知'}`,
							]}
							description={playlistMetadata.description ?? '暂无描述'}
							onClickMainButton={() => playAll()}
						/>
					}
					keyExtractor={keyExtractor}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					showsVerticalScrollIndicator={false}
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
