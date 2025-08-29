import SearchSuggestions from '@/app/tabs/home/components/SearchSuggestions'
import { alert } from '@/components/modals/AlertModal'
import NowPlayingBar from '@/components/NowPlayingBar'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import useAppStore from '@/hooks/stores/useAppStore'
import { queryClient } from '@/lib/config/queryClient'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { useShareIntentContext } from 'expo-share-intent'
import { useCallback, useEffect, useState } from 'react'
import { Keyboard, View } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { useMMKVObject } from 'react-native-mmkv'
import { Chip, IconButton, Searchbar, Text, useTheme } from 'react-native-paper'
import { useAnimatedRef } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'
import { matchSearchStrategies } from '../../../utils/search'

const SEARCH_HISTORY_KEY = 'bilibili_search_history'
const MAX_SEARCH_HISTORY = 10

interface SearchHistoryItem {
	id: string
	text: string
	timestamp: number
}

function HomePage() {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const [searchQuery, setSearchQuery] = useState('')
	const [searchHistory, setSearchHistory] =
		useMMKVObject<SearchHistoryItem[]>(SEARCH_HISTORY_KEY)
	const [isLoading, setIsLoading] = useState(false)
	const { hasShareIntent, shareIntent, resetShareIntent } =
		useShareIntentContext()
	const clearBilibiliCookie = useAppStore((state) => state.clearBilibiliCookie)
	const hasBilibiliCookie = useAppStore((state) => state.hasBilibiliCookie)
	const searchBarRef = useAnimatedRef<View>()

	const {
		data: personalInfo,
		isPending: personalInfoPending,
		isError: personalInfoError,
	} = usePersonalInformation()

	const getGreetingMsg = () => {
		const hour = new Date().getHours()
		if (hour >= 0 && hour < 6) return '凌晨好'
		if (hour >= 6 && hour < 12) return '早上好'
		if (hour >= 12 && hour < 18) return '下午好'
		if (hour >= 18 && hour < 24) return '晚上好'
		return '你好'
	}

	const greeting = getGreetingMsg()

	const saveSearchHistory = useCallback(
		(history: SearchHistoryItem[]) => {
			try {
				setSearchHistory(history)
			} catch (error) {
				toastAndLogError('保存搜索历史失败', error, 'UI.Home')
			}
		},
		[setSearchHistory],
	)

	const addSearchHistory = useCallback(
		(query: string) => {
			if (!query.trim()) return

			const newItem: SearchHistoryItem = {
				id: `history_${Date.now()}`,
				text: query,
				timestamp: Date.now(),
			}

			const currentHistory = searchHistory ?? []
			const existingIndex = currentHistory.findIndex(
				(item) => item.text.toLowerCase() === query.toLowerCase(),
			)

			let newHistory: SearchHistoryItem[]

			if (existingIndex !== -1) {
				newHistory = [
					newItem,
					...currentHistory.filter(
						(item) => item.text.toLowerCase() !== query.toLowerCase(),
					),
				]
			} else {
				newHistory = [newItem, ...currentHistory]
			}

			if (newHistory.length > MAX_SEARCH_HISTORY) {
				newHistory = newHistory.slice(0, MAX_SEARCH_HISTORY)
			}

			saveSearchHistory(newHistory)
		},
		[searchHistory, saveSearchHistory],
	)

	const handleEnter = useCallback(
		async (query: string) => {
			if (!query.trim()) return
			Keyboard.dismiss()
			setIsLoading(true)
			const addToHistory = await matchSearchStrategies(query, navigation)
			if (addToHistory) {
				addSearchHistory(query)
			}
			setIsLoading(false)
			setSearchQuery('')
		},
		[addSearchHistory, navigation],
	)

	const handleSuggestionPress = (query: string) => {
		void handleEnter(query)
	}

	const handleSearchItemClick = (query: string) => {
		setSearchQuery(query)
		// 直接跳转到搜索页面，我们可以确定，所有保存的搜索历史都是有效的关键词，而非 url/id 什么的
		navigation.navigate('SearchResult', { query })
	}

	useEffect(() => {
		if (!hasShareIntent) return
		const query = (shareIntent?.webUrl ?? shareIntent?.text ?? '').trim()
		if (!query) {
			resetShareIntent()
			return
		}

		resetShareIntent()
		void handleEnter(query)
	}, [hasShareIntent, shareIntent, navigation, resetShareIntent, handleEnter])

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			{/*顶部欢迎区域*/}
			<View
				style={{
					paddingHorizontal: 16,
					paddingTop: insets.top + 8,
				}}
			>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<View>
						<Text
							variant='headlineSmall'
							style={{ fontWeight: 'bold' }}
						>
							BBPlayer
						</Text>
						<Text
							variant='bodyMedium'
							style={{ color: colors.onSurfaceVariant }}
						>
							{greeting}，
							{personalInfoPending || personalInfoError || !personalInfo
								? '陌生人'
								: personalInfo.name}
						</Text>
					</View>
					<RectButton
						enabled={hasBilibiliCookie()}
						onPress={() =>
							alert(
								'退出登录？',
								'是否退出登录？',
								[
									{ text: '取消' },
									{
										text: '确定',
										onPress: async () => {
											clearBilibiliCookie()
											await queryClient.cancelQueries()
											queryClient.clear()
											toast.success('Cookie 已清除')
										},
									},
								],
								{ cancelable: true },
							)
						}
						style={{ borderRadius: 20, overflow: 'hidden' }}
					>
						<Image
							style={{ width: 40, height: 40, borderRadius: 20 }}
							source={
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								!personalInfoPending && !personalInfoError && personalInfo?.face
									? { uri: personalInfo.face }
									: // eslint-disable-next-line @typescript-eslint/no-require-imports
										require('@/assets/images/bilibili-default-avatar.jpg')
							}
						/>
					</RectButton>
				</View>
			</View>

			<View style={{ marginTop: 16 }}>
				{/* 搜索栏 */}
				<View
					style={{
						paddingTop: 10,
						paddingHorizontal: 16,
						paddingBottom: 8,
					}}
				>
					<View ref={searchBarRef}>
						<Searchbar
							placeholder='关键词 / b23.tv 或完整网址 / bv / av'
							onChangeText={setSearchQuery}
							value={searchQuery}
							icon={isLoading ? 'loading' : 'magnify'}
							onClearIconPress={() => setSearchQuery('')}
							onSubmitEditing={() => handleEnter(searchQuery)}
							elevation={0}
							mode='bar'
							style={{
								borderRadius: 9999,
								backgroundColor: colors.surfaceVariant,
							}}
						/>
					</View>
					<SearchSuggestions
						query={searchQuery}
						visible={searchQuery.length > 0}
						onSuggestionPress={handleSuggestionPress}
						searchBarRef={searchBarRef}
					/>
				</View>

				{/* 搜索历史 */}
				<View style={{ marginTop: 16, marginBottom: 24, marginHorizontal: 16 }}>
					<View
						style={{
							marginBottom: 8,
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<Text
							variant='titleMedium'
							style={{ fontWeight: 'bold' }}
						>
							最近搜索
						</Text>
						{searchHistory && searchHistory.length > 0 && (
							<IconButton
								icon='trash-can-outline'
								size={20}
								onPress={() =>
									alert(
										'清空搜索历史？',
										'确定要清空吗？',
										[
											{ text: '取消' },
											{
												text: '确定',
												onPress: () => {
													setSearchHistory([])
												},
											},
										],
										{ cancelable: true },
									)
								}
							/>
						)}
					</View>
					{searchHistory && searchHistory.length > 0 ? (
						<View
							style={{
								flexDirection: 'row',
								flexWrap: 'wrap',
								marginHorizontal: 5,
							}}
						>
							{searchHistory.map((item) => (
								<Chip
									key={item.id}
									onPress={() => handleSearchItemClick(item.text)}
									onLongPress={() =>
										alert(
											'删除搜索历史？',
											`确定要删除「${item.text}」吗？`,
											[
												{ text: '取消' },
												{
													text: '确定',
													onPress: () => {
														// 优化：使用 filter 创建新数组，避免直接修改 state
														const newHistory = searchHistory.filter(
															(h) => h.id !== item.id,
														)
														setSearchHistory(newHistory)
													},
												},
											],
											{ cancelable: true },
										)
									}
									style={{ marginRight: 8, marginBottom: 8 }}
									mode='outlined'
								>
									{item.text}
								</Chip>
							))}
						</View>
					) : (
						<Text
							style={{
								paddingVertical: 8,
								textAlign: 'center',
								color: colors.onSurfaceVariant,
							}}
						>
							暂无搜索历史
						</Text>
					)}
				</View>
			</View>
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}

export default HomePage
