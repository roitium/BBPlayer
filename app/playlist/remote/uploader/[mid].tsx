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
import { BilibiliUserUploadedVideosResponse } from '@/types/apis/bilibili'
import { formatMMSSToSeconds } from '@/utils/times'
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
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PlaylistAppBar } from '../../../../components/playlist/PlaylistAppBar'
import { PlaylistError } from '../../../../components/playlist/PlaylistError'
import { PlaylistLoading } from '../../../../components/playlist/PlaylistLoading'
import type { RootStackParamList } from '../../../../types/navigation'

const mapApiItemToViewTrack = (
	apiItem: BilibiliUserUploadedVideosResponse['list']['vlist'][0],
) => {
	return {
		id: apiItem.bvid,
		bvid: apiItem.bvid,
		title: apiItem.title,
		artist: {
			id: apiItem.aid,
			name: apiItem.author,
			source: 'bilibili',
		},
		coverUrl: apiItem.pic,
		duration: formatMMSSToSeconds(apiItem.length),
		source: 'bilibili', // 明确来源
		isMultiPage: false,
	}
}

type UITrack = ReturnType<typeof mapApiItemToViewTrack>

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
	// const [modalVisible, setModalVisible] = useState(false)
	// const [currentModalBvid, setCurrentModalBvid] = useState('')

	// const playTrack = useCallback(
	// 	async (track: Track, playNow = false) => {
	// 		try {
	// 			await addToQueue({
	// 				tracks: [track],
	// 				playNow: playNow,
	// 				clearQueue: false,
	// 				playNext: !playNow,
	// 			})
	// 		} catch (error) {
	// 			playlistLog.sentry('添加到队列失败', error)
	// 		}
	// 	},
	// 	[addToQueue],
	// )

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
		return uploadedVideos.pages
			.flatMap((page) => page.list.vlist)
			.map(mapApiItemToViewTrack)
	}, [uploadedVideos])

	const trackMenuItems = useCallback(
		(_item: UITrack) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: () => toast.show('暂未实现'),
			},
			TrackMenuItemDividerToken,
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					toast.show('暂未实现')
				},
			},
			TrackMenuItemDividerToken,
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					// navigation.navigate('PlaylistMultipage', { bvid: item.id })
					toast.show('暂未实现')
				},
			},
		],
		[],
	)

	const renderItem = useCallback(
		({ item, index }: { item: UITrack; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={() => toast.show('暂未实现')}
					menuItems={trackMenuItems(item)}
				/>
			)
		},
		[trackMenuItems],
	)

	const keyExtractor = useCallback((item: UITrack) => item.bvid, [])

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

			{/* <AddToFavoriteListsModal
				key={currentModalBvid}
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/> */}
		</View>
	)
}
