import { memo, useCallback, useState } from 'react'
import { View, TouchableOpacity, FlatList, RefreshControl } from 'react-native'
import {
  Text,
  SegmentedButtons,
  IconButton,
  useTheme,
  Searchbar,
  FAB,
  Menu,
  ActivityIndicator,
  Divider,
  Icon,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import useAppStore from '@/lib/store/useAppStore'
import type { Playlist } from '@/types/core/media'
import { router } from 'expo-router'
import {
  useGetFavoritePlaylists,
  useInfiniteCollectionsList,
} from '@/hooks/queries/useFavoriteData'
import type { BilibiliCollection } from '@/types/apis/bilibili'
import { usePersonalInformation } from '@/hooks/queries/useUserData'
import FastImage from '@d11/react-native-fast-image'

export default function LibraryScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [value, setValue] = useState('favorite')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMenuVisible, setSortMenuVisible] = useState(false)

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      {/* 顶部区域 */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className='px-4 pb-2'
      >
        <View className='mb-4 flex-row items-center justify-between'>
          <Text
            variant='headlineSmall'
            style={{ fontWeight: 'bold' }}
          >
            音乐库
          </Text>
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon='sort'
                iconColor={colors.onBackground}
                size={24}
                onPress={() => setSortMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {}}
              title='按名称排序'
              leadingIcon='sort-alphabetical-ascending'
            />
            <Menu.Item
              onPress={() => {}}
              title='按添加时间排序'
              leadingIcon='sort-calendar-descending'
            />
            <Menu.Item
              onPress={() => {}}
              title='按艺术家排序'
              leadingIcon='sort-alphabetical-ascending'
            />
          </Menu>
        </View>

        {/* 搜索栏 */}
        <View className='mb-4'>
          <Searchbar
            placeholder='搜索我的音乐库'
            onChangeText={setSearchQuery}
            value={searchQuery}
            elevation={0}
            mode='bar'
            className='rounded-full'
            style={{ backgroundColor: colors.surfaceVariant }}
          />
        </View>

        {/* 分段按钮 */}
        <SegmentedButtons
          value={value}
          onValueChange={setValue}
          buttons={[
            { value: 'favorite', label: '我的收藏夹', icon: 'folder-open' },
            { value: 'collection', label: '合集追更', icon: 'book' },
          ]}
          style={{ marginBottom: 16, width: '70%', marginHorizontal: 'auto' }}
        />
      </View>

      {/* 内容区域 */}
      <View className='flex-1 px-4'>
        <FavoriteFolderListComponent isHidden={value !== 'favorite'} />
        <CollectionListComponent isHidden={value !== 'collection'} />
      </View>

      {/* 浮动操作按钮 */}
      {value === 'playlists' && (
        <FAB
          icon='playlist-plus'
          style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 80,
            backgroundColor: colors.primary,
          }}
          color={colors.onPrimary}
          onPress={() => {}}
        />
      )}

      {/* 当前播放栏 */}
      <View className='absolute right-0 bottom-0 left-0'>
        <NowPlayingBar />
      </View>
    </View>
  )
}

const FavoriteFolderListItem = memo(({ item }: { item: Playlist }) => {
  return (
    <View key={item.id}>
      <View className='my-2 overflow-hidden'>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            router.push(`/playlist/favorite/${item.id}`)
          }}
        >
          <View className='flex-row items-center p-2'>
            <View className='ml-3 flex-1'>
              <Text
                variant='titleMedium'
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text variant='bodySmall'>{item.count} 首歌曲</Text>
            </View>
            <Icon
              source='arrow-right'
              size={24}
            />
          </View>
        </TouchableOpacity>
      </View>
      <Divider />
    </View>
  )
})

/**
 * 渲染收藏夹列表页
 */
const FavoriteFolderListComponent = memo(
  ({
    isHidden,
  }: {
    isHidden: boolean
  }) => {
    const bilibiliApi = useAppStore((state) => state.bilibiliApi)
    const {
      data: playlists,
      isPending: playlistsIsPending,
      isError: playlistsIsError,
    } = useGetFavoritePlaylists(bilibiliApi)

    // 渲染收藏夹项
    const renderPlaylistItem = useCallback(
      ({ item }: { item: Playlist }) => <FavoriteFolderListItem item={item} />,
      [],
    )

    const keyExtractor = useCallback((item: Playlist) => item.id.toString(), [])

    if (isHidden) return null

    if (playlistsIsPending) {
      return (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </View>
      )
    }

    if (playlistsIsError) {
      return (
        <View className='flex-1 items-center justify-center'>
          <Text
            variant='titleMedium'
            className='text-center'
          >
            加载失败
          </Text>
        </View>
      )
    }

    return (
      <>
        <View className='mb-2 flex-row items-center justify-between'>
          <Text
            variant='titleMedium'
            style={{ fontWeight: 'bold' }}
          >
            我的收藏夹
          </Text>
          <Text variant='bodyMedium'>{playlists.length} 个收藏夹</Text>
        </View>
        <FlatList
          className='flex-1'
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<Text className='text-center'>没有收藏夹</Text>}
        />
      </>
    )
  },
)

/**
 * 渲染追更合集页
 */
const CollectionListComponent = memo(
  ({
    isHidden,
  }: {
    isHidden: boolean
  }) => {
    const bilibiliApi = useAppStore((state) => state.bilibiliApi)
    const { data: userInfo } = usePersonalInformation(bilibiliApi)
    const {
      data: collections,
      isPending: collectionsIsPending,
      isError: collectionsIsError,
      refetch,
      hasNextPage,
      fetchNextPage,
    } = useInfiniteCollectionsList(bilibiliApi, Number(userInfo?.mid))
    const [refreshing, setRefreshing] = useState(false)
    const colors = useTheme().colors

    // 渲染追更合集项
    const renderCollectionItem = useCallback(
      ({ item }: { item: BilibiliCollection }) => (
        <CollectionListItem item={item} />
      ),
      [],
    )

    const keyExtractor = useCallback(
      (item: BilibiliCollection) => item.id.toString(),
      [],
    )

    if (isHidden) return null

    if (collectionsIsPending) {
      return (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </View>
      )
    }

    if (collectionsIsError) {
      return (
        <View className='flex-1 items-center justify-center'>
          <Text
            variant='titleMedium'
            className='text-center'
          >
            加载失败
          </Text>
        </View>
      )
    }

    return (
      <>
        <View className='mb-2 flex-row items-center justify-between'>
          <Text
            variant='titleMedium'
            style={{ fontWeight: 'bold' }}
          >
            我的合集/收藏夹追更
          </Text>
          <Text variant='bodyMedium'>{collections.pages[0].count} 个追更</Text>
        </View>
        <FlatList
          data={collections.pages.flatMap((page) => page.list)}
          renderItem={renderCollectionItem}
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
              <View className='flex-row items-center justify-center p-4'>
                <ActivityIndicator size='small' />
              </View>
            ) : null
          }
        />
      </>
    )
  },
)

/**
 * 渲染追更合集项
 */
const CollectionListItem = memo(
  ({
    item,
  }: {
    item: BilibiliCollection
  }) => {
    return (
      <View key={item.id}>
        <View className='my-2 overflow-hidden'>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={item.state === 1}
            onPress={() => {
              router.push(
                item.attr === 0
                  ? `/playlist/collection/${item.id}`
                  : `/playlist/favorite/${item.id}`,
              )
            }}
          >
            <View className='flex-row items-center p-2'>
              <FastImage
                source={{ uri: item.cover }}
                style={{ width: 48, height: 48, borderRadius: 4 }}
              />
              <View className='ml-3 flex-1'>
                <Text
                  variant='titleMedium'
                  className='pr-2'
                >
                  {item.title}
                </Text>
                <Text variant='bodySmall'>
                  {item.state === 0 ? item.upper.name : '已失效'} •{' '}
                  {item.media_count} 首歌曲
                </Text>
              </View>
              <Icon
                source='arrow-right'
                size={24}
              />
            </View>
          </TouchableOpacity>
        </View>
        <Divider />
      </View>
    )
  },
)
