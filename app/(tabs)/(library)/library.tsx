import { useState } from 'react'
import { View, ScrollView, TouchableOpacity } from 'react-native'
import {
  Text,
  SegmentedButtons,
  IconButton,
  Surface,
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
import { useGetFavoritePlaylists } from '@/hooks/api/useHomeData'
import type { Playlist } from '@/types/core/media'
import { router } from 'expo-router'

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
            { value: 'favorite', label: '收藏夹', icon: 'folder-open' },
            { value: 'playlists', label: '播放列表', icon: 'playlist-play' },
          ]}
          style={{ marginBottom: 16, width: '70%', marginHorizontal: 'auto' }}
        />
      </View>

      {/* 内容区域 */}
      <View className='flex-1 px-4'>
        <FavoriteFolderListComponent isHidden={value !== 'favorite'} />

        {value === 'playlists' && (
          <Text className='text-center'>正在开发中</Text>
        )}
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

/**
 * 渲染收藏夹列表页
 */
const FavoriteFolderListComponent = ({
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
  const renderPlaylistItem = (item: Playlist) => (
    <>
      <Surface
        key={item.id}
        className='my-1 overflow-hidden rounded-lg'
        elevation={0}
      >
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
      </Surface>
      <Divider />
    </>
  )

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
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {playlists.map(renderPlaylistItem)}
      </ScrollView>
    </>
  )
}
