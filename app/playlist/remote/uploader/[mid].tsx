import BatchAddTracksToLocalPlaylistModal from '@/components/modals/BatchAddTracksToLocalPlaylist'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useInfiniteGetUserUploadedVideos,
	useOtherUserInfo,
} from '@/hooks/queries/bilibili/user'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { useDebouncedValue } from '@/hooks/utils/useDebouncedValue'
import { bv2av } from '@/lib/api/bilibili/utils'
import type {
	BilibiliUserInfo,
	BilibiliUserUploadedVideosResponse,
} from '@/types/apis/bilibili'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { formatMMSSToSeconds } from '@/utils/time'
import toast from '@/utils/toast'
import {
	type RouteProp,
	useNavigation,
	usePreventRemove,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import {
	ActivityIndicator,
	Appbar,
	Divider,
	Searchbar,
	Text,
	useTheme,
} from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const SEARCHBAR_HEIGHT = 72

const mapApiItemToTrack = (
	apiItem: BilibiliUserUploadedVideosResponse['list']['vlist'][0],
	uploaderData: BilibiliUserInfo,
): BilibiliTrack => {
	return {
		id: bv2av(apiItem.bvid),
		uniqueKey: `bilibili::${apiItem.bvid}`,
		source: 'bilibili',
		title: apiItem.title,
		artist: {
			id: uploaderData.mid,
			name: uploaderData.name,
			avatarUrl: uploaderData.face,
			source: 'bilibili',
			remoteId: uploaderData.mid.toString(),
			createdAt: new Date(apiItem.created),
			updatedAt: new Date(apiItem.created),
		},
		coverUrl: apiItem.pic,
		duration: formatMMSSToSeconds(apiItem.length),
		playHistory: [],
		bilibiliMetadata: {
			bvid: apiItem.bvid,
			cid: null,
			isMultiPage: false,
			videoIsValid: true,
		},
		createdAt: new Date(apiItem.created),
		updatedAt: new Date(apiItem.created),
	}
}

export default function UploaderPage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistUploader'>>()
	const { mid } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistUploader'>
		>()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalTrack, setCurrentModalTrack] = useState<Track | undefined>(
		undefined,
	)

	const [selected, setSelected] = useState<Set<number>>(() => new Set()) // 使用 track id 作为索引
	const [selectMode, setSelectMode] = useState<boolean>(false)
	const [batchAddTracksModalVisible, setBatchAddTracksModalVisible] =
		useState(false)
	const [batchAddTracksModalPayloads, setBatchAddTracksModalPayloads] =
		useState<{ track: CreateTrackPayload; artist: CreateArtistPayload }[]>([])

	const [searchQuery, setSearchQuery] = useState('')
	const [startSearch, setStartSearch] = useState(false)
	const searchbarHeight = useSharedValue(0)
	const debouncedQuery = useDebouncedValue(searchQuery, 200)

	const searchbarAnimatedStyle = useAnimatedStyle(() => ({
		height: searchbarHeight.value,
	}))

	useEffect(() => {
		searchbarHeight.set(
			withTiming(startSearch ? SEARCHBAR_HEIGHT : 0, { duration: 180 }),
		)
	}, [searchbarHeight, startSearch])

	const {
		data: uploadedVideos,
		isPending: isUploadedVideosPending,
		isError: isUploadedVideosError,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteGetUserUploadedVideos(Number(mid), debouncedQuery)

	const {
		data: uploaderUserInfo,
		isPending: isUserInfoPending,
		isError: isUserInfoError,
	} = useOtherUserInfo(Number(mid))

	const tracks = useMemo(() => {
		if (!uploadedVideos || !uploaderUserInfo) return []
		return uploadedVideos.pages
			.flatMap((page) => page.list.vlist)
			.map((item) => mapApiItemToTrack(item, uploaderUserInfo))
	}, [uploadedVideos, uploaderUserInfo])

	const handlePlayTrack = useCallback(
		(item: BilibiliTrack, playNext = false) => {
			void addToQueue({
				tracks: [item],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
			})
		},
		[addToQueue],
	)

	const trackMenuItems = useCallback(
		(item: BilibiliTrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'skip-next-circle-outline',
				onPress: () => handlePlayTrack(item, true),
			},
			{
				title: '添加到本地歌单',
				leadingIcon: 'playlist-plus',
				onPress: () => {
					setCurrentModalTrack(item)
					setModalVisible(true)
				},
			},
			{
				title: '查看详细信息',
				leadingIcon: 'file-document-outline',
				onPress: () => {
					navigation.navigate('PlaylistMultipage', {
						bvid: item.bilibiliMetadata.bvid,
					})
				},
			},
			{
				title: '查看 up 主作品',
				leadingIcon: 'account-music',
				onPress: () => {
					if (!item.artist?.remoteId) {
						toast.error('未找到 up 主信息')
						return
					}
					navigation.navigate('PlaylistUploader', {
						mid: item.artist?.remoteId,
					})
				},
			},
		],
		[navigation, handlePlayTrack],
	)

	const toggle = useCallback((id: number) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const enterSelectMode = useCallback((id: number) => {
		setSelectMode(true)
		setSelected(new Set([id]))
	}, [])

	const renderItem = useCallback(
		({ item, index }: { item: BilibiliTrack; index: number }) => {
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
					toggleSelected={toggle}
					isSelected={selected.has(item.id)}
					selectMode={selectMode}
					enterSelectMode={enterSelectMode}
				/>
			)
		},
		[
			trackMenuItems,
			handlePlayTrack,
			toggle,
			selected,
			selectMode,
			enterSelectMode,
		],
	)

	const keyExtractor = useCallback(
		(item: BilibiliTrack) => item.bilibiliMetadata.bvid,
		[],
	)

	useEffect(() => {
		if (typeof mid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [mid, navigation])

	usePreventRemove(selectMode, () => {
		setSelectMode(false)
		setSelected(new Set())
	})

	if (typeof mid !== 'string') {
		return null
	}

	if (isUserInfoPending) {
		return <PlaylistLoading />
	}

	if (isUploadedVideosPending && !startSearch) {
		return <PlaylistLoading />
	}

	if (isUploadedVideosError || isUserInfoError) {
		return <PlaylistError text='加载失败' />
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.Content
					title={
						selectMode ? `已选择 ${selected.size} 首` : uploaderUserInfo.name
					}
				/>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				{selectMode ? (
					<Appbar.Action
						icon='playlist-plus'
						onPress={() => {
							const payloads = []
							for (const id of selected) {
								const track = tracks.find((t) => t.id === id)
								if (track) {
									payloads.push({
										track: track as Track,
										artist: track.artist!,
									})
								}
							}
							setBatchAddTracksModalPayloads(payloads)
							setBatchAddTracksModalVisible(true)
						}}
					/>
				) : (
					<Appbar.Action
						icon={startSearch ? 'close' : 'magnify'}
						onPress={() => setStartSearch((prev) => !prev)}
					/>
				)}
			</Appbar.Header>

			{/* 搜索框 */}
			<Animated.View style={[{ overflow: 'hidden' }, searchbarAnimatedStyle]}>
				<Searchbar
					mode='view'
					placeholder='搜索歌曲'
					onChangeText={setSearchQuery}
					value={searchQuery}
				/>
			</Animated.View>

			<View
				style={{
					flex: 1,
				}}
			>
				<FlashList
					data={tracks ?? []}
					extraData={{ selectMode, selected }}
					estimatedItemSize={70}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					renderItem={renderItem}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={uploaderUserInfo.face}
							title={uploaderUserInfo.name}
							subtitles={`${uploadedVideos?.pages[0].page.count ?? 0} 首歌曲`}
							description={uploaderUserInfo.sign}
							onClickMainButton={undefined}
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
					ItemSeparatorComponent={() => <Divider />}
					showsVerticalScrollIndicator={false}
					onEndReached={hasNextPage ? () => fetchNextPage() : null}
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

			{currentModalTrack && (
				<AddVideoToLocalPlaylistModal
					track={currentModalTrack}
					visible={modalVisible}
					setVisible={setModalVisible}
				/>
			)}
			{selectMode && (
				<BatchAddTracksToLocalPlaylistModal
					visible={batchAddTracksModalVisible}
					setVisible={setBatchAddTracksModalVisible}
					payloads={batchAddTracksModalPayloads}
				/>
			)}
		</View>
	)
}
