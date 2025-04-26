import { Image } from 'expo-image'
import { useCallback, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Menu,
  Searchbar,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import { useHotSearches, useSearchResults } from '@/hooks/queries/useSearchData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'
import Toast from '@/utils/toast'

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
  const [finalQuery, setFinalQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [pageInputValue, setPageInputValue] = useState('1')
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] =
    useMMKVObject<SearchHistoryItem[]>(SEARCH_HISTORY_KEY)

  const playNext = useCallback(
    async (track: Track) => {
      try {
        await addToQueue({
          tracks: [track],
          playNow: false,
          clearQueue: false,
          playNext: true,
        })
      } catch (error) {
        searchLog.sentry('添加到队列失败', error)
      }
    },
    [addToQueue],
  )

  const playNow = useCallback(
    async (track: Track) => {
      try {
        await addToQueue({
          tracks: [track],
          playNow: true,
          clearQueue: false,
          playNext: false,
        })
      } catch (error) {
        searchLog.sentry('添加到队列失败', error)
      }
    },
    [addToQueue],
  )

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

      if (!searchHistory) {
        setSearchHistory([newItem])
        return
      }

      // 检查是否已存在相同的查询
      const existingIndex = searchHistory?.findIndex(
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
      saveSearchHistory(newHistory)
    },
    [searchHistory, saveSearchHistory, setSearchHistory],
  )

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
      addSearchHistory(searchQuery)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    setPageInputValue(newPage.toString())
  }

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

  const renderSearchResultItem = (item: Track) => (
    <TouchableRipple
      key={item.id}
      style={{ paddingVertical: 5 }}
      onPress={() => playNow(item)}
    >
      <Surface
        style={{ overflow: 'hidden', borderRadius: 8 }}
        elevation={0}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
        >
          <Image
            source={{ uri: item.cover }}
            style={{ width: 48, height: 48, borderRadius: 4 }}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text variant='titleMedium'>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant='bodySmall'>{item.artist}</Text>
              <Text
                style={{ marginHorizontal: 4 }}
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
                Toast.show('开发中，敬请期待')
              }}
              title='添加到收藏夹'
            />
            <Menu.Item
              leadingIcon='play-circle-outline'
              onPress={() => {
                playNext(item)
                setMenuVisible(null)
              }}
              title='下一首播放'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableRipple>
  )

  const renderPagination = () => (
    <View
      style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}
    >
      <View
        style={{
          marginTop: 16,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
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
      <View
        style={{
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextInput
            value={pageInputValue}
            onChangeText={handlePageInputChange}
            onSubmitEditing={handlePageJump}
            keyboardType='number-pad'
            style={{
              width: 50,
              height: 30,
              paddingVertical: 0,
              marginVertical: 0,
              textAlignVertical: 'center',
            }}
            dense
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
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
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
          placeholder='搜索歌曲、歌手、专辑'
          onChangeText={handleSearchInput}
          value={searchQuery}
          onClearIconPress={clearSearch}
          onSubmitEditing={handleSearchSubmit}
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
      >
        {!isSearching ? (
          <>
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
          </>
        ) : (
          <>
            {/* 搜索结果 */}
            <View style={{ marginTop: 16 }}>
              <Text
                variant='titleMedium'
                style={{ marginBottom: 8, fontWeight: 'bold' }}
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
                  style={{
                    paddingVertical: 16,
                    textAlign: 'center',
                    color: colors.onSurfaceVariant,
                  }}
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
