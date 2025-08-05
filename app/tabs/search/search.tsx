import log from '@/utils/log'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'
import { Chip, Searchbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

const searchLog = log.extend('SEARCH')

const SEARCH_HISTORY_KEY = 'bilibili_search_history'
const MAX_SEARCH_HISTORY = 10

interface SearchHistoryItem {
	id: string
	text: string
	timestamp: number
}

export default function SearchPage() {
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const [searchQuery, setSearchQuery] = useState('')
	const [searchHistory, setSearchHistory] =
		useMMKVObject<SearchHistoryItem[]>(SEARCH_HISTORY_KEY)

	// 保存搜索历史到本地存储
	const saveSearchHistory = useCallback(
		(history: SearchHistoryItem[]) => {
			try {
				setSearchHistory(history)
			} catch (error) {
				searchLog.error('保存搜索历史失败:', error)
				toast.error('保存搜索历史失败', {
					description: error,
				})
			}
		},
		[setSearchHistory],
	)

	// 添加搜索历史
	const addSearchHistory = useCallback(
		(query: string) => {
			if (!query.trim()) return

			const newItem: SearchHistoryItem = {
				id: `history_${Date.now()}`,
				text: query,
				timestamp: Date.now(),
			}

			const currentHistory = searchHistory ?? []

			// 检查是否已存在相同的查询
			const existingIndex = currentHistory.findIndex(
				(item) => item.text.toLowerCase() === query.toLowerCase(),
			)

			let newHistory: SearchHistoryItem[]

			if (existingIndex !== -1) {
				// 如果已存在，移除旧的并添加新的到顶部
				newHistory = [
					newItem,
					...currentHistory.filter(
						(item) => item.text.toLowerCase() !== query.toLowerCase(),
					),
				]
			} else {
				// 如果不存在，添加到顶部
				newHistory = [newItem, ...currentHistory]
			}

			// 限制历史记录数量
			if (newHistory.length > MAX_SEARCH_HISTORY) {
				newHistory = newHistory.slice(0, MAX_SEARCH_HISTORY)
			}

			saveSearchHistory(newHistory)
		},
		[searchHistory, saveSearchHistory],
	)

	// 跳转到结果页
	const navigateToResults = (query: string) => {
		if (!query.trim()) return
		addSearchHistory(query)
		// 我不喜欢清除，因为我可能要反复搜索调整关键词
		// setSearchQuery('')
		navigation.navigate('SearchResult', { query })
	}

	// 处理搜索历史或热门搜索项点击
	const handleSearchItemClick = (query: string) => {
		setSearchQuery(query) // 更新输入框内容
		navigateToResults(query) // 跳转并保存历史
	}

	return (
		<View
			style={{
				flex: 1,
				paddingTop: insets.top + 8,
				backgroundColor: colors.background,
			}}
		>
			<View
				style={{
					paddingHorizontal: 16,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='headlineSmall'
					style={{ fontWeight: 'bold' }}
				>
					搜索
				</Text>
			</View>
			{/* 搜索栏 */}
			<View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8 }}>
				<Searchbar
					placeholder='搜索 B 站'
					onChangeText={(query) => setSearchQuery(query)}
					value={searchQuery}
					onClearIconPress={() => setSearchQuery('')}
					onSubmitEditing={() => navigateToResults(searchQuery)}
					elevation={0}
					mode='bar'
					style={{
						borderRadius: 9999,
						backgroundColor: colors.surfaceVariant,
					}}
				/>
			</View>

			{/* 内容区域 */}
			<ScrollView
				style={{ flex: 1, paddingHorizontal: 16 }}
				contentContainerStyle={{ paddingBottom: 20 }}
				keyboardShouldPersistTaps='handled'
				contentInsetAdjustmentBehavior='automatic'
			>
				{/* 搜索历史 */}
				<View style={{ marginTop: 16, marginBottom: 24 }}>
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
							<TouchableOpacity onPress={() => setSearchHistory([])}>
								<Text
									variant='labelMedium'
									style={{ color: colors.primary }}
								>
									清除
								</Text>
							</TouchableOpacity>
						)}
					</View>
					{searchHistory && searchHistory.length > 0 ? (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
							{searchHistory.map((item) => (
								<Chip
									key={item.id}
									onPress={() => handleSearchItemClick(item.text)}
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
			</ScrollView>
		</View>
	)
}
