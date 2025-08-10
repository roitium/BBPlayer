import { PlaylistHeader } from '@/components/playlist/PlaylistHeader'
import {
	TrackListItem,
	TrackMenuItemDividerToken,
} from '@/components/playlist/PlaylistItem'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import {
	useInfiniteGetUserUploadedVideos,
	useOtherUserInfo,
} from '@/hooks/queries/bilibili/user'
import { bv2av } from '@/lib/api/bilibili/utils'
import type {
	BilibiliUserInfo,
	BilibiliUserUploadedVideosResponse,
} from '@/types/apis/bilibili'
import type { BilibiliTrack } from '@/types/core/media'
import { formatMMSSToSeconds } from '@/utils/time'
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
		if (!uploadedVideos || !uploaderUserInfo) return []
		return uploadedVideos.pages
			.flatMap((page) => page.list.vlist)
			.map((item) => mapApiItemToTrack(item, uploaderUserInfo))
	}, [uploadedVideos, uploaderUserInfo])

	const trackMenuItems = useCallback(
		(item: BilibiliTrack) => [
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
				onPress: () => {
					navigation.navigate('PlaylistMultipage', {
						bvid: item.bilibiliMetadata.bvid,
					})
				},
			},
		],
		[navigation],
	)

	const renderItem = useCallback(
		({ item, index }: { item: BilibiliTrack; index: number }) => {
			return (
				<TrackListItem
					index={index}
					onTrackPress={() => toast.show('暂未实现')}
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
		[trackMenuItems],
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
			<Appbar.Header elevated>
				<Appbar.Content title={uploaderUserInfo.name} />
				<Appbar.BackAction onPress={() => navigation.goBack()} />
			</Appbar.Header>

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
							subtitles={`${uploadedVideos.pages[0].page.count} 首歌曲`}
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

			{/* <AddToFavoriteListsModal
				key={currentModalBvid}
				visible={modalVisible}
				bvid={currentModalBvid}
				setVisible={setModalVisible}
			/> */}
		</View>
	)
}
