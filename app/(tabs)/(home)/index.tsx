import NowPlayingBar from '@/components/NowPlayingBar'
import {
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import {
  Text,
  useTheme,
  Chip,
  Avatar,
  Surface,
  IconButton,
  Menu,
  Dialog,
  TextInput,
  Button,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useState } from 'react'
import {
  usePopularVideos,
  useRecentlyPlayed,
  useSyncedPlaylists,
} from '@/hooks/api/useHomeData'
import type { Track, Playlist } from '@/types/core/media'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import { formatDurationToHHMM } from '@/utils/times'

const mockCategories = [
  { id: '1', name: '翻唱', icon: 'music-note' },
  { id: '2', name: 'VOCALOID', icon: 'music-note' },
  { id: '3', name: '人力音MAD', icon: 'music-note' },
  { id: '4', name: '原创', icon: 'music-note' },
  { id: '5', name: 'OST', icon: 'music-note' },
]

const SetCookieDialog = ({
  visible,
  setVisible,
  setCookie,
  cookie,
  setBilibiliCookie,
}: {
  visible: boolean
  setVisible: (visible: boolean) => void
  setCookie: (cookie: string) => void
  cookie: string
  setBilibiliCookie: (cookie: string) => void
}) => {
  return (
    <Dialog
      visible={visible}
      onDismiss={() => setVisible(false)}
    >
      <Dialog.Title>设置 Bilibili Cookie</Dialog.Title>
      <Dialog.Content>
        <TextInput
          label='Cookie'
          value={cookie}
          onChangeText={setCookie}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={() => setVisible(false)}>取消</Button>
        <Button
          onPress={() => {
            setCookie(cookie)
            setBilibiliCookie(cookie)
            setVisible(false)
          }}
        >
          确定
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

const HomePage = () => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const { addToQueue, clearQueue } = usePlayerStore()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const {
    bilibiliCookie,
    bilibiliAvatar,
    setBilibiliCookie,
    bilibiliApi,
    bilibiliUid,
  } = useAppStore()
  const [setCookieDialogVisible, setSetCookieDialogVisible] = useState(false)
  const [cookie, setCookie] = useState(bilibiliCookie)

  // 播放单曲（清空队列后播放）
  const playSingleTrack = async (track: Track) => {
    try {
      await clearQueue()
      await addToQueue([track])
    } catch (error) {
      console.error('播放单曲失败', error)
    }
  }

  // 添加到队列
  const addTrackToQueue = async (track: Track) => {
    try {
      await addToQueue([track])
    } catch (error) {
      console.error('添加到队列失败', error)
    }
  }

  // useRefreshQueriesOnFocus([
  //   homeQueryKeys.recentlyPlayed(),
  //   homeQueryKeys.playlists(),
  //   homeQueryKeys.popularVideos(),
  // ])

  let {
    data: recentlyPlayed,
    isLoading: recentlyPlayedLoading,
    refetch: recentlyPlayedRefetch,
  } = useRecentlyPlayed(bilibiliApi)

  const {
    data: playlists,
    isLoading: playlistsLoading,
    refetch: playlistsRefetch,
  } = useSyncedPlaylists(bilibiliApi, bilibiliUid)
  let {
    data: popularVideos,
    isLoading: popularVideosLoading,
    refetch: popularVideosRefetch,
  } = usePopularVideos(bilibiliApi)

  if (!recentlyPlayedLoading) recentlyPlayed = recentlyPlayed?.slice(0, 10)
  if (!popularVideosLoading) popularVideos = popularVideos?.slice(0, 10)

  const onRefresh = () => {
    setRefreshing(true)
    recentlyPlayedRefetch()
    popularVideosRefetch()
    playlistsRefetch()
    setRefreshing(false)
  }

  // 渲染最近播放项
  const renderRecentItem = (item: Track) => (
    <TouchableOpacity
      key={item.id}
      className='mb-2'
      activeOpacity={0.7}
      onPress={() => playSingleTrack(item)}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={0}
      >
        <View className='flex-row items-center p-2'>
          <Image
            source={{ uri: item.cover }}
            className='rounded'
            style={{ width: 48, height: 48 }}
            // onError={(error) => {
            //   // console.log('图片加载失败：', error)
            //   // Toast.show({
            //   //   text1: `图片加载失败：${item.cover}`,
            //   //   text2: `错误：${error.nativeEvent.error}`,
            //   //   type: 'error',
            //   // })
            //   Alert.alert('图片加载失败', error.nativeEvent.error)
            // }}
          />
          <View className='ml-3 flex-1'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View className='flex-row items-center'>
              <Text
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                {item.artist}
              </Text>
              <Text
                className='mx-1'
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                •
              </Text>
              <Text
                variant='bodySmall'
                style={{ color: colors.onSurfaceVariant }}
              >
                {formatDurationToHHMM(item.duration)}
              </Text>
            </View>
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
            anchorPosition='bottom'
          >
            <Menu.Item
              leadingIcon='play-circle'
              onPress={() => playSingleTrack(item)}
              title='立即播放'
            />
            <Menu.Item
              leadingIcon='playlist-plus'
              onPress={() => addTrackToQueue(item)}
              title='添加到播放队列'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableOpacity>
  )

  // 渲染推荐项
  const renderForYouItem = (item: Track) => (
    <TouchableOpacity
      key={item.id}
      className='mr-4 w-32'
      activeOpacity={0.7}
      onPress={() => playSingleTrack(item)}
      onLongPress={() => setMenuVisible(item.id)}
    >
      <Image
        source={{ uri: item.cover }}
        className='h-32 w-32 rounded-lg'
      />
      <View className='mt-2'>
        <Text
          variant='titleSmall'
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          variant='bodySmall'
          style={{ color: colors.onSurfaceVariant }}
          numberOfLines={1}
        >
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  )

  // 渲染播放列表项
  const renderPlaylistItem = (item: Playlist) => (
    <TouchableOpacity
      key={item.id}
      className='mr-4 w-40'
      activeOpacity={0.7}
      onPress={() => {}}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={1}
      >
        <Image
          source={{ uri: item.cover }}
          className='h-40 w-40 rounded-lg'
        />
        <View className='p-2'>
          <Text
            variant='titleSmall'
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
      </Surface>
    </TouchableOpacity>
  )

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        className='flex-1'
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* 顶部欢迎区域 */}
        <View
          className='px-4 pt-2 pb-4'
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className='flex-row items-center justify-between'>
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
                我只想听点音乐，拜托让一切简单点
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSetCookieDialogVisible(true)
              }}
            >
              <Avatar.Image
                size={40}
                source={{
                  uri: bilibiliAvatar,
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 分类选择区 */}
        <View className='mb-4 px-4'>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {mockCategories.map((category) => (
              <Chip
                key={category.id}
                icon={category.icon}
                onPress={() => {}}
                style={{ marginRight: 8 }}
                mode='outlined'
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* 最近播放 */}
        <View className='mb-6 px-4'>
          <View className='mb-2 flex-row items-center justify-between'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              最近播放
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                查看全部
              </Text>
            </TouchableOpacity>
          </View>
          {recentlyPlayed?.map(renderRecentItem)}
        </View>

        {/* 为你推荐 */}
        <View className='mb-6'>
          <View className='mb-2 flex-row items-center justify-between px-4'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              为你推荐
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                更多
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
          >
            {popularVideos?.map(renderForYouItem)}
          </ScrollView>
        </View>

        {/* 你的播放列表 */}
        <View className='mb-6'>
          <View className='mb-2 flex-row items-center justify-between px-4'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              你的播放列表
            </Text>
            <TouchableOpacity>
              <Text
                variant='labelLarge'
                style={{ color: colors.primary }}
              >
                查看全部
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
          >
            {playlists?.map(renderPlaylistItem)}
          </ScrollView>
        </View>
      </ScrollView>

      {/* 当前播放栏 */}
      <View className='absolute right-0 bottom-0 left-0'>
        <NowPlayingBar />
      </View>

      <SetCookieDialog
        visible={setCookieDialogVisible}
        setVisible={setSetCookieDialogVisible}
        setCookie={setCookie}
        cookie={cookie}
        setBilibiliCookie={setBilibiliCookie}
      />
    </View>
  )
}

export default HomePage
