import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { ActivityIndicator, Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import NowPlayingBar from '@/components/NowPlayingBar'
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import {
	useInfiniteGetUserUploadedVideos,
	useOtherUserInfo,
} from '@/hooks/queries/bilibili/useUserData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { transformUserUploadedVideosToTracks } from '@/lib/api/bilibili/bilibili.transformers'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'

const playlistLog = log.extend('PLAYLIST/UPLOADER')

export default function UploaderPage() {
	const { mid } = useLocalSearchParams()
	const { colors } = useTheme()
	const router = useRouter()
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const currentTrack = usePlayerStore((state) => state.currentTrack)
	const [refreshing, setRefreshing] = useState(false)
	const insets = useSafeAreaInsets()
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

	// 播放
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
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					setCurrentModalBvid(item.id)
					setModalVisible(true)
				},
			},
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					router.push(`/playlist/multipage/${item.id}`)
				},
			},
		],
		[playTrack, router.push],
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
			// @ts-expect-error: 触发 404
			router.replace('/not-found')
		}
	}, [mid, router])

	if (typeof mid !== 'string') {
		return
	}

	if (isUploadedVideosPending || isUserInfoPending) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
				<ActivityIndicator size='large' />
			</View>
		)
	}

	if (isUploadedVideosError || isUserInfoError) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
				<Text
					variant='titleMedium'
					style={{ textAlign: 'center' }}
				>
					加载失败
				</Text>
			</View>
		)
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 500 }}>
				<Appbar.BackAction
					onPress={() => {
						router.back()
					}}
				/>
			</Appbar.Header>

			{/* 顶部背景图 */}
			<View style={{ position: 'absolute', height: '100%', width: '100%' }}>
				<Image
					source={{ uri: uploaderUserInfo?.face }}
					style={{
						width: '100%',
						height: '100%',
						opacity: 0.15,
					}}
					blurRadius={15}
				/>
			</View>

			<View
				style={{
					flex: 1,
					paddingBottom: currentTrack ? 80 + insets.bottom : insets.bottom,
				}}
			>
				<FlatList
					data={tracks}
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
								style={{ textAlign: 'center', paddingTop: 10 }}
							>
								•
							</Text>
						)
					}
				/>
			</View>

			<AddToFavoriteListsModal
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/>

			<View
				style={{
					position: 'absolute',
					right: 0,
					bottom: insets.bottom,
					left: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
