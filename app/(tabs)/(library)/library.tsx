import { useState } from 'react'
import { View, ScrollView, Image, TouchableOpacity } from 'react-native'
import {
  Text,
  SegmentedButtons,
  IconButton,
  Surface,
  useTheme,
  Searchbar,
  FAB,
  Menu,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import { router } from 'expo-router'

// 模拟数据
const mockDownloadedMusic = [
  {
    id: '1',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    cover:
      'https://i2.hdslb.com/bfs/archive/1a6b02f1f4fce81ea063fd33a9793b84deaec765.jpg',
  },
  {
    id: '2',
    title: '稻香',
    artist: '周杰伦',
    album: '魔杰座',
    cover:
      'https://i1.hdslb.com/bfs/archive/b28c463d4c1d85bde894c7c3fbde04b4ccf1f9d3.jpg',
  },
  {
    id: '3',
    title: '告白气球',
    artist: '周杰伦',
    album: '周杰伦的床边故事',
    cover:
      'https://i2.hdslb.com/bfs/archive/2842b219c7aa503b90dbdaafb55e2e6c6d81b3a7.jpg',
  },
  {
    id: '4',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    cover:
      'https://i0.hdslb.com/bfs/archive/e0a1a808e8a75fef6048a417318a88148aec9eab.jpg',
  },
]

const mockFavoriteMusic = [
  {
    id: '1',
    title: '夜曲',
    artist: '周杰伦',
    album: '十一月的萧邦',
    cover:
      'https://i1.hdslb.com/bfs/archive/a9d11b7c9d8f6f3e0a6a10c2f2a9d0e9f0e9d0e9.jpg',
  },
  {
    id: '2',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    cover:
      'https://i0.hdslb.com/bfs/archive/e0a1a808e8a75fef6048a417318a88148aec9eab.jpg',
  },
  {
    id: '3',
    title: '青花瓷',
    artist: '周杰伦',
    album: '我很忙',
    cover:
      'https://i2.hdslb.com/bfs/archive/f9c3a3cf1c3cce1f09a0d80b16c3c7a812be04c9.jpg',
  },
  {
    id: '4',
    title: '盛夏光年',
    artist: '陈绮贞',
    cover:
      'https://i1.hdslb.com/bfs/archive/b9c5503132b3a8f7c3c9a0129c51a7c8d6a3b96c.jpg',
    album: '华语经典',
  },
  {
    id: '5',
    title: '小情歌',
    artist: '苏打绿',
    cover:
      'https://i0.hdslb.com/bfs/archive/e9e610e6c5e7e5af01b99e06b7c518f8f0e5b3c8.jpg',
    album: '小宇宙',
  },
]

const mockPlaylists = [
  {
    id: '1',
    title: '我的收藏',
    count: 42,
    cover:
      'https://i0.hdslb.com/bfs/archive/7c1e86f6e23cf89a9b5e114c2b29a5e466ad2d5f.jpg',
  },
  {
    id: '2',
    title: '周杰伦精选',
    count: 28,
    cover:
      'https://i2.hdslb.com/bfs/archive/1a6b02f1f4fce81ea063fd33a9793b84deaec765.jpg',
  },
  {
    id: '3',
    title: '陈绮贞精选',
    count: 15,
    cover:
      'https://i0.hdslb.com/bfs/archive/7c1e86f6e23cf89a9b5e114c2b29a5e466ad2d5f.jpg',
  },
  {
    id: '4',
    title: '华语经典',
    count: 56,
    cover:
      'https://i1.hdslb.com/bfs/archive/b9c5503132b3a8f7c3c9a0129c51a7c8d6a3b96c.jpg',
  },
]

export default function LibraryScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [value, setValue] = useState('downloaded')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const [sortMenuVisible, setSortMenuVisible] = useState(false)

  // 渲染音乐列表项
  const renderMusicItem = (item: (typeof mockDownloadedMusic)[0]) => (
    <Surface
      key={item.id}
      className='mb-2 overflow-hidden rounded-lg'
      elevation={0}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/player')}
      >
        <View className='flex-row items-center p-2'>
          <Image
            source={{ uri: item.cover }}
            className='h-14 w-14 rounded'
          />
          <View className='ml-3 flex-1'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              variant='bodySmall'
              style={{ color: colors.onSurfaceVariant }}
              numberOfLines={1}
            >
              {item.artist} · {item.album}
            </Text>
          </View>
          <Menu
            visible={menuVisible === item.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon='dots-vertical'
                iconColor={colors.onSurfaceVariant}
                size={24}
                onPress={() => setMenuVisible(item.id)}
              />
            }
          >
            <Menu.Item
              onPress={() => {}}
              title='添加到播放列表'
              leadingIcon='playlist-plus'
            />
            <Menu.Item
              onPress={() => {}}
              title='分享'
              leadingIcon='share-variant'
            />
            {value === 'downloaded' ? (
              <Menu.Item
                onPress={() => {}}
                title='删除下载'
                leadingIcon='delete'
              />
            ) : (
              <Menu.Item
                onPress={() => {}}
                title='取消收藏'
                leadingIcon='heart-off'
              />
            )}
          </Menu>
        </View>
      </TouchableOpacity>
    </Surface>
  )

  // 渲染播放列表项
  const renderPlaylistItem = (item: (typeof mockPlaylists)[0]) => (
    <Surface
      key={item.id}
      className='mb-2 overflow-hidden rounded-lg'
      elevation={0}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {}}
      >
        <View className='flex-row items-center p-2'>
          <Image
            source={{ uri: item.cover }}
            className='h-14 w-14 rounded'
          />
          <View className='ml-3 flex-1'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              variant='bodySmall'
              style={{ color: colors.onSurfaceVariant }}
            >
              {item.count} 首歌曲
            </Text>
          </View>
          <IconButton
            icon='play-circle-outline'
            iconColor={colors.primary}
            size={24}
            onPress={() => {}}
          />
        </View>
      </TouchableOpacity>
    </Surface>
  )

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
            我的音乐库
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
            { value: 'downloaded', label: '下载' },
            { value: 'favorite', label: '收藏' },
            { value: 'playlists', label: '播放列表' },
          ]}
          style={{ marginBottom: 16 }}
        />
      </View>

      {/* 内容区域 */}
      <ScrollView
        className='flex-1 px-4'
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {value === 'downloaded' && (
          <>
            <View className='mb-2 flex-row items-center justify-between'>
              <Text
                variant='titleMedium'
                style={{ fontWeight: 'bold' }}
              >
                已下载的音乐
              </Text>
              <Text
                variant='bodyMedium'
                style={{ color: colors.onSurfaceVariant }}
              >
                {mockDownloadedMusic.length} 首歌曲
              </Text>
            </View>
            {mockDownloadedMusic.map(renderMusicItem)}
          </>
        )}

        {value === 'favorite' && (
          <>
            <View className='mb-2 flex-row items-center justify-between'>
              <Text
                variant='titleMedium'
                style={{ fontWeight: 'bold' }}
              >
                我喜欢的音乐
              </Text>
              <Text
                variant='bodyMedium'
                style={{ color: colors.onSurfaceVariant }}
              >
                {mockFavoriteMusic.length} 首歌曲
              </Text>
            </View>
            {mockFavoriteMusic.map(renderMusicItem)}
          </>
        )}

        {value === 'playlists' && (
          <>
            <View className='mb-2 flex-row items-center justify-between'>
              <Text
                variant='titleMedium'
                style={{ fontWeight: 'bold' }}
              >
                我的播放列表
              </Text>
              <Text
                variant='bodyMedium'
                style={{ color: colors.onSurfaceVariant }}
              >
                {mockPlaylists.length} 个播放列表
              </Text>
            </View>
            {mockPlaylists.map(renderPlaylistItem)}
          </>
        )}
      </ScrollView>

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
