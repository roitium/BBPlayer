import { useCallback, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'
import {
  ActivityIndicator,
  Chip,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router' // Import router
import NowPlayingBar from '@/components/NowPlayingBar'
import { useHotSearches } from '@/hooks/queries/bilibili/useSearchData'
import useAppStore from '@/lib/store/useAppStore'
import log from '@/utils/log'

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
  const [searchQuery, setSearchQuery] = useState('')
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const [searchHistory, setSearchHistory] =
    useMMKVObject<SearchHistoryItem[]>(SEARCH_HISTORY_KEY)

  const { data: hotSearches = [], isLoading: isLoadingHotSearches } =
    useHotSearches(bilibiliApi)

  // 保存搜索历史到本地存储
  const saveSearchHistory = useCallback(
    (history: SearchHistoryItem[]) => {
      try {
        setSearchHistory(history)
      } catch (error) {
        searchLog.sentry('保存搜索历史失败:', error)
      }
    },
    [setSearchHistory],
  )

  // 添加搜索历史
  const addSearchHistory = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      const newItem: SearchHistoryItem = {
        id: `history_${Date.now()}`,
        text: query,
        timestamp: Date.now(),
      }

      const currentHistory = searchHistory || []

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
    setSearchQuery('')
    router.push(`/search-result/${query}`)
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

        {/* 热门搜索 */}
        <View style={{ marginBottom: 24 }}>
          <Text
            variant='titleMedium'
            style={{ marginBottom: 8, fontWeight: 'bold' }}
          >
            热门搜索
          </Text>
          {isLoadingHotSearches ? (
            <ActivityIndicator size='small' />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {hotSearches.map((item) => (
                <Chip
                  key={item.id}
                  onPress={() => handleSearchItemClick(item.text)}
                  style={{ marginRight: 8, marginBottom: 8 }}
                  mode='flat'
                >
                  {item.text}
                </Chip>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底部播放栏 */}
      <NowPlayingBar />
    </View>
  )
}
