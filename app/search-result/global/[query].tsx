import {
	type RouteProp,
	useNavigation,
	useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, View } from 'react-native'
import {
	ActivityIndicator,
	Appbar,
	Button,
	Text,
	TextInput,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import NowPlayingBar from '@/components/NowPlayingBar'
import { TrackListItem } from '@/components/playlist/PlaylistItem'
import { MULTIPAGE_VIDEO_KEYWORDS } from '@/constants/search'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useSearchResults } from '@/hooks/queries/bilibili/useSearchData'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import toast from '@/utils/toast'
import type { RootStackParamList } from '../../../types/navigation'

const searchLog = log.extend('SEARCH_RESULTS/GLOBAL')

export default function SearchResultsPage() {
	const { colors } = useTheme()
	const navigation =
		useNavigation<
			NativeStackNavigationProp<RootStackParamList, 'SearchResult'>
		>()
	const route = useRoute<RouteProp<RootStackParamList, 'SearchResult'>>()
	const { query } = route.params
	const currentTrack = useCurrentTrack()

	const [searchQuery, setSearchQuery] = useState(query || '')
	const [currentPage, setCurrentPage] = useState(1)
	const [pageSize] = useState(20)
	const [pageInputValue, setPageInputValue] = useState('1')
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')
	const insets = useSafeAreaInsets()

	useEffect(() => {
		if (query) {
			setSearchQuery(query)
			setCurrentPage(1)
			setPageInputValue('1')
		}
	}, [query])

	const { data: searchData, isLoading: isLoadingResults } = useSearchResults(
		searchQuery,
		currentPage,
		pageSize,
	)

	const searchResults = searchData?.tracks || []
	const totalPages = searchData?.numPages || 1

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
				searchLog.sentry('添加到队列失败', error)
				toast.show('添加到队列失败')
			}
		},
		[addToQueue],
	)

	// 如果匹配到分 p 视频（通过正则匹配可能的标题关键字），跳转到分 p 视频页面
	const onTrackPress = useCallback(
		async (track: Track) => {
			if (
				MULTIPAGE_VIDEO_KEYWORDS.some((keyword) =>
					track.title?.includes(keyword),
				)
			) {
				navigation.navigate('PlaylistMultipage', { bvid: track.id })
				return
			}
			try {
				await addToQueue({
					tracks: [track],
					playNow: true,
					clearQueue: false,
					playNext: false,
				})
			} catch (error) {
				searchLog.sentry('播放失败', error)
				toast.show('播放失败')
			}
		},
		[addToQueue, navigation],
	)

	const handlePageChange = useCallback(
		(newPage: number) => {
			if (newPage < 1 || newPage > totalPages) return
			setCurrentPage(newPage)
			setPageInputValue(newPage.toString())
		},
		[totalPages],
	)

	const handlePageInputChange = useCallback((text: string) => {
		if (/^\d*$/.test(text)) {
			setPageInputValue(text)
		}
	}, [])

	const handlePageJump = useCallback(() => {
		const pageNumber = Number.parseInt(pageInputValue, 10)
		if (
			!Number.isNaN(pageNumber) &&
			pageNumber >= 1 &&
			pageNumber <= totalPages
		) {
			setCurrentPage(pageNumber)
		} else {
			setPageInputValue(currentPage.toString())
			toast.warning(`请输入 1 到 ${totalPages} 之间的页码`)
		}
	}, [pageInputValue, currentPage, totalPages])

	const trackMenuItems = useCallback(
		(item: Track) => [
			{
				title: '下一首播放',
				leadingIcon: 'play-circle-outline',
				onPress: playNext,
			},
			{
				title: '作为分P视频展示',
				leadingIcon: 'eye-outline',
				onPress: async () => {
					navigation.navigate('PlaylistMultipage', { bvid: item.id })
				},
			},
			{
				title: '添加到收藏夹',
				leadingIcon: 'plus',
				onPress: () => {
					setCurrentModalBvid(item.id)
					setModalVisible(true)
				},
			},
		],
		[playNext, navigation],
	)

	const renderSearchResultItem = useCallback(
		({ item, index }: { item: Track; index: number }) => {
			return (
				<TrackListItem
					item={item}
					index={index}
					onTrackPress={onTrackPress}
					menuItems={trackMenuItems(item)}
				/>
			)
		},
		[trackMenuItems, onTrackPress],
	)

	const renderPagination = useCallback(
		() => (
			<View style={{ alignItems: 'center', paddingVertical: 16 }}>
				{/* Page Buttons */}
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 16,
						marginBottom: 16,
					}}
				>
					<Button
						mode='outlined'
						onPress={() => handlePageChange(currentPage - 1)}
						disabled={currentPage <= 1 || isLoadingResults}
						icon='chevron-left'
					>
						上一页
					</Button>
					<Text variant='bodyMedium'>第 {currentPage} 页</Text>
					<Button
						mode='outlined'
						onPress={() => handlePageChange(currentPage + 1)}
						disabled={currentPage >= totalPages || isLoadingResults}
						icon='chevron-right'
						contentStyle={{ flexDirection: 'row-reverse' }}
					>
						下一页
					</Button>
				</View>

				{/* Page Jump Input */}
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<TextInput
						value={pageInputValue}
						onChangeText={handlePageInputChange}
						onSubmitEditing={handlePageJump}
						keyboardType='number-pad'
						style={{
							width: 60,
							height: 36,
							textAlign: 'center',
						}}
						mode='outlined'
						dense
					/>
					<Text
						variant='bodyMedium'
						style={{ marginHorizontal: 8 }}
					>
						/ {totalPages}
					</Text>
					<Button
						mode='contained'
						onPress={handlePageJump}
						disabled={
							isLoadingResults ||
							!pageInputValue ||
							Number.parseInt(pageInputValue, 10) === currentPage
						}
						style={{ minWidth: 60 }}
					>
						跳转
					</Button>
				</View>
			</View>
		),
		[
			currentPage,
			handlePageChange,
			handlePageInputChange,
			handlePageJump,
			isLoadingResults,
			pageInputValue,
			totalPages,
		],
	)

	const keyExtractor = useCallback((item: Track) => item.id, [])

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
				paddingBottom: currentTrack ? 80 : 0,
			}}
		>
			{/* Header with Back Button and Title */}
			<Appbar.Header
				style={{ backgroundColor: colors.surface }}
				elevated
			>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content
					title={`搜索: ${searchQuery}`}
					titleStyle={{ fontSize: 18 }}
				/>
			</Appbar.Header>

			{/* Content Area */}
			{isLoadingResults ? (
				<ActivityIndicator
					size='large'
					style={{ marginTop: 32 }}
				/>
			) : (
				<FlatList
					contentContainerStyle={{ paddingBottom: 20 }}
					data={searchResults}
					renderItem={renderSearchResultItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={totalPages > 1 ? renderPagination() : undefined}
					ListEmptyComponent={
						<Text
							style={{
								paddingVertical: 32,
								textAlign: 'center',
								color: colors.onSurfaceVariant,
							}}
						>
							没有找到与 &quot;{searchQuery}&rdquo; 相关的内容
						</Text>
					}
				/>
			)}

			<AddToFavoriteListsModal
				bvid={currentModalBvid}
				visible={modalVisible}
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
