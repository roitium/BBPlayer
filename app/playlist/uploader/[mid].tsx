import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useInfiniteGetUserUploadedVideos,
	useOtherUserInfo,
} from '@/hooks/queries/bilibili/useUserData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { transformUserUploadedVideosToTracks } from '@/lib/api/bilibili/bilibili.transformers'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { LegendList } from '@legendapp/list'
import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../types/navigation'

const playlistLog = log.extend('PLAYLIST/UPLOADER')

export default function UploaderPage() {
	const route = useRoute<RouteProp<RootStackParamList, 'PlaylistUploader'>>()
	const { mid } = route.params
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'PlaylistUploader'>
		>()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

	const playTrack = useCallback(
		async (track: Track, playNow = false) => {
			try {
				await addToQueue({
					tracks: [track],
					playNow: playNow,
					clearQueue: false,
					playNext: !playNow,
				})
			} catch (error) {
				playlistLog.sentry('添加到队列失败', error)
			}
		},
		[addToQueue],
	)

	const {
		data: uploadedVideos,
		isPending: isUploadedVideosPending,
		isError: isUploadedVideosError,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteGetUserUploadedVideos(Number(mid))

	const {
		data: uploaderUserInfo,
		isPending: isUserInfoPending,
		isError: isUserInfoError,
	} = useOtherUserInfo(Number(mid))

	const tracks = useMemo(() => {
		if (!uploadedVideos) return []
		return transformUserUploadedVideosToTracks(
			uploadedVideos?.pages.flatMap((page) => page.list.vlist),
		)
	}, [uploadedVideos])

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => playTrack(item, false),
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					setCurrentModalBvid(item.id)
					setModalVisible(true)
				},
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
				},
			},
		],
		[playTrack, navigation],
	)

	const renderItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={() => playTrack(item, true)}
					menuItems={trackMenuItems(item)}
				/>
			)
		},
		[playTrack, trackMenuItems],
	)

	const keyExtractor = useCallback((item: Track) => item.id, [])

	useEffect(() => {
		if (typeof mid !== 'string') {
			navigation.replace('NotFound')
		}
	}, [mid, navigation])

	if (typeof mid !== 'string') {
		return null
	}

	if (isUploadedVideosPending || isUserInfoPending) {
		return <PlaylistLoading />
	}

	if (isUploadedVideosError || isUserInfoError) {
		return <PlaylistError text='加载失败' />
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
					data={tracks}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					renderItem={renderItem}
					ListHeaderComponent={
						<PlaylistHeader
							coverUri={uploaderUserInfo.face}
							title={uploaderUserInfo.name}
							subtitle={`${uploadedVideos.pages[0].page.count} 首歌曲`}
							description={uploaderUserInfo.sign}
							onPlayAll={undefined}
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

			<AddToFavoriteListsModal
				key={currentModalBvid}
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>
		</View>
	)
}
