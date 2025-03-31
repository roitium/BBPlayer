import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native'
import Image from '@d11/react-native-fast-image'
import {
  Searchbar,
  Text,
  Chip,
  Surface,
  useTheme,
  IconButton,
  ActivityIndicator,
  Button,
  TouchableRipple,
  Menu,
  TextInput,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import { useSearchResults, useHotSearches } from '@/hooks/queries/useSearchData'
import type { Track } from '@/types/core/media'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import { formatDurationToHHMMSS } from '@/utils/times'
import { showToast } from '@/utils/toast'

// 搜索历史的存储键
const SEARCH_HISTORY_KEY = 'bilibili_search_history'
// 最大搜索历史数量
const MAX_SEARCH_HISTORY = 10

// 搜索历史项类型
interface SearchHistoryItem {
  id: string
  text: string
  timestamp: number
}

export default function SearchPage() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [finalQuery, setFinalQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20) // 每页显示20条结果
  const [pageInputValue, setPageInputValue] = useState('1')
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const [menuVisible, setMenuVisible] = useState<string | null>(null)

  // 下一首播放
  const playNext = async (track: Track) => {
    try {
      await addToQueue([track], false, false, undefined, true)
    } catch (error) {
      console.error('添加到队列失败', error)
    }
  }

  // 本地搜索历史状态
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // 从本地存储加载搜索历史
  const loadSearchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true)
      const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY)
      if (historyJson) {
        const history = JSON.parse(historyJson) as SearchHistoryItem[]
        setSearchHistory(history)
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  // 保存搜索历史到本地存储
  const saveSearchHistory = useCallback(
    async (history: SearchHistoryItem[]) => {
      try {
        await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
      } catch (error) {
        console.error('保存搜索历史失败:', error)
      }
    },
    [],
  )

  // 添加搜索历史
  const addSearchHistory = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      // 创建新的历史项
      const newItem: SearchHistoryItem = {
        id: `history_${Date.now()}`,
        text: query,
        timestamp: Date.now(),
      }

      // 检查是否已存在相同的查询
      const existingIndex = searchHistory.findIndex(
        (item) => item.text.toLowerCase() === query.toLowerCase(),
      )

      let newHistory: SearchHistoryItem[]

      if (existingIndex !== -1) {
        // 如果已存在，移除旧的并添加新的到顶部
        newHistory = [
          newItem,
          ...searchHistory.filter(
            (item) => item.text.toLowerCase() !== query.toLowerCase(),
          ),
        ]
      } else {
        // 如果不存在，添加到顶部
        newHistory = [newItem, ...searchHistory]
      }

      // 限制历史记录数量
      if (newHistory.length > MAX_SEARCH_HISTORY) {
        newHistory = newHistory.slice(0, MAX_SEARCH_HISTORY)
      }

      setSearchHistory(newHistory)
      await saveSearchHistory(newHistory)
    },
    [searchHistory, saveSearchHistory],
  )

  // 清除所有搜索历史
  const clearAllSearchHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY)
      setSearchHistory([])
      Alert.alert('提示', '搜索历史已清除')
    } catch (error) {
      console.error('清除搜索历史失败:', error)
      Alert.alert('错误', '清除搜索历史失败')
    }
  }, [])

  // 确认清除搜索历史
  const confirmClearHistory = useCallback(() => {
    Alert.alert(
      '清除搜索历史',
      '确定要清除所有搜索历史吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: clearAllSearchHistory,
        },
      ],
      { cancelable: true },
    )
  }, [clearAllSearchHistory])

  // 组件挂载时加载搜索历史
  useEffect(() => {
    loadSearchHistory()
  }, [loadSearchHistory])

  // 使用API查询 - 使用防抖后的查询
  const { data: searchData, isLoading: isLoadingResults } = useSearchResults(
    finalQuery,
    currentPage,
    pageSize,
    bilibiliApi,
  )

  const searchResults = searchData?.tracks || []
  const totalPages = searchData?.numPages || 1

  const { data: hotSearches = [], isLoading: isLoadingHotSearches } =
    useHotSearches(bilibiliApi)

  // 处理搜索输入
  const handleSearchInput = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // 重置为第一页
    setPageInputValue('1')
  }

  // 处理搜索历史或热门搜索项点击
  const handleSearchItemClick = (query: string) => {
    setSearchQuery(query)
    setFinalQuery(query) // 立即设置防抖查询，不等待延迟
    setCurrentPage(1)
    setPageInputValue('1')
    setIsSearching(true)
    // 添加到搜索历史
    addSearchHistory(query)
  }

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery('')
    setFinalQuery('')
    setIsSearching(false)
    setCurrentPage(1)
    setPageInputValue('1')
  }

  // 处理搜索提交
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setIsSearching(true)
      setFinalQuery(searchQuery)
      // 添加到搜索历史
      addSearchHistory(searchQuery)
    }
  }

  // 处理页码变化
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    setPageInputValue(newPage.toString())
  }

  // 处理页码输入
  const handlePageInputChange = (text: string) => {
    // 只允许输入数字
    if (/^\d*$/.test(text)) {
      setPageInputValue(text)
    }
  }

  // 处理页码跳转
  const handlePageJump = () => {
    const pageNumber = Number.parseInt(pageInputValue, 10)
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    } else {
      // 如果输入的页码无效，重置为当前页码
      setPageInputValue(currentPage.toString())
    }
  }

  // 渲染搜索结果项
  const renderSearchResultItem = (item: Track) => (
    <TouchableRipple
      key={item.id}
      style={{ paddingVertical: 5 }}
      onPress={() => playNext(item)}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={0}
      >
        <View className='flex-row items-center p-2'>
          <Image
            source={{ uri: item.cover }}
            style={{ width: 48, height: 48, borderRadius: 4 }}
          />
          <View className='ml-3 flex-1'>
            <Text variant='titleMedium'>{item.title}</Text>
            <View className='flex-row items-center'>
              <Text variant='bodySmall'>{item.artist}</Text>
              <Text
                className='mx-1'
                variant='bodySmall'
              >
                •
              </Text>
              <Text variant='bodySmall'>
                {item.duration ? formatDurationToHHMMSS(item.duration) : ''}
              </Text>
            </View>
          </View>
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon='dots-vertical'
                size={24}
                onPress={() => setMenuVisible(item.id)}
              />
            }
            anchorPosition='bottom'
          >
            <Menu.Item
              leadingIcon='playlist-plus'
              onPress={() => {
                showToast({
                  severity: 'info',
                  title: '开发中，敬请期待',
                })
              }}
              title='添加到收藏夹'
            />
            <Menu.Item
              leadingIcon='play-circle-outline'
              onPress={() => {
                playNext(item)
              }}
              title='下一首播放'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableRipple>
  )

  // 渲染分页控件
  const renderPagination = () => (
    <View className='item-center flex flex-col'>
      <View className='mt-4 mb-6 flex-row items-center justify-center gap-5'>
        <Button
          mode='outlined'
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon='chevron-left'
        >
          上一页
        </Button>

        <Button
          mode='outlined'
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon='chevron-right'
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          下一页
        </Button>
      </View>
      <View className='mx-auto flex-row items-center'>
        <View className='ml-2 flex-row items-center'>
          <TextInput
            value={pageInputValue}
            onChangeText={handlePageInputChange}
            onSubmitEditing={handlePageJump}
            keyboardType='number-pad'
            style={{
              width: 50,
              height: 30,
            }}
          />
          <Text variant='bodyMedium'>
            {' / '}
            {totalPages}
          </Text>
          <Button
            mode='text'
            onPress={handlePageJump}
            disabled={!pageInputValue}
          >
            跳转
          </Button>
        </View>
      </View>
    </View>
  )

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      {/* 搜索栏 */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className='px-4 pb-2'
      >
        <Searchbar
          placeholder='搜索歌曲、歌手、专辑'
          onChangeText={handleSearchInput}
          value={searchQuery}
          onClearIconPress={clearSearch}
          onSubmitEditing={handleSearchSubmit}
          elevation={0}
          mode='bar'
          className='rounded-full'
          style={{ backgroundColor: colors.surfaceVariant }}
        />
      </View>

      {/* 内容区域 */}
      <ScrollView
        className='flex-1 px-4'
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {!isSearching ? (
          <>
            {/* 搜索历史 */}
            <View className='mt-4 mb-6'>
              <View className='mb-2 flex-row items-center justify-between'>
                <Text
                  variant='titleMedium'
                  style={{ fontWeight: 'bold' }}
                >
                  最近搜索
                </Text>
                {searchHistory.length > 0 && (
                  <TouchableOpacity onPress={confirmClearHistory}>
                    <Text
                      variant='labelMedium'
                      style={{ color: colors.primary }}
                    >
                      清除
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {isLoadingHistory ? (
                <ActivityIndicator size='small' />
              ) : searchHistory.length > 0 ? (
                <View className='flex-row flex-wrap'>
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
                  className='py-2 text-center'
                  style={{ color: colors.onSurfaceVariant }}
                >
                  暂无搜索历史
                </Text>
              )}
            </View>

            {/* 热门搜索 */}
            <View className='mb-6'>
              <Text
                variant='titleMedium'
                className='mb-2'
                style={{ fontWeight: 'bold' }}
              >
                热门搜索
              </Text>
              {isLoadingHotSearches ? (
                <ActivityIndicator size='small' />
              ) : (
                <View className='flex-row flex-wrap'>
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
          </>
        ) : (
          <>
            {/* 搜索结果 */}
            <View className='mt-4'>
              <Text
                variant='titleMedium'
                className='mb-2'
                style={{ fontWeight: 'bold' }}
              >
                搜索结果
              </Text>
              {isLoadingResults ? (
                <ActivityIndicator size='large' />
              ) : searchResults.length > 0 ? (
                <>
                  <View>{searchResults.map(renderSearchResultItem)}</View>
                  {renderPagination()}
                </>
              ) : (
                <Text
                  className='py-4 text-center'
                  style={{ color: colors.onSurfaceVariant }}
                >
                  没有找到相关结果
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 底部播放栏 */}
      <NowPlayingBar />
    </View>
  )
}
