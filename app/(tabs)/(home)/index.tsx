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
import type { Track, Playlist } from '@/types/core/media'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import { router } from 'expo-router'
import { formatDurationToHHMMSS } from '@/utils/times'
import {
  usePersonalInformation,
  useRecentlyPlayed,
} from '@/hooks/api/useUserData'
import { useGetFavoritePlaylists } from '@/hooks/api/useFavoriteData'

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
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const bilibiliCookie = useAppStore((state) => state.bilibiliCookie)
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
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
      await addToQueue([track], false)
    } catch (error) {
      console.error('添加到队列失败', error)
    }
  }

  const {
    data: personalInfo,
    isLoading: personalInfoLoading,
    refetch: personalInfoRefetch,
  } = usePersonalInformation(bilibiliApi)

  let {
    data: recentlyPlayed,
    isLoading: recentlyPlayedLoading,
    refetch: recentlyPlayedRefetch,
  } = useRecentlyPlayed(bilibiliApi)

  const {
    data: playlists,
    isLoading: playlistsLoading,
    refetch: playlistsRefetch,
  } = useGetFavoritePlaylists(bilibiliApi, personalInfo?.mid)

  if (!recentlyPlayedLoading) recentlyPlayed = recentlyPlayed?.slice(0, 10)

  const onRefresh = () => {
    setRefreshing(true)
    recentlyPlayedRefetch()
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

  // 渲染收藏夹项
  const renderPlaylistItem = (item: Playlist) => (
    <TouchableOpacity
      key={item.id}
      className='mr-4 w-40'
      activeOpacity={0.7}
      onPress={() => {
        router.push(`/playlist/favorite/${item.id}`)
      }}
    >
      <Surface
        className='overflow-hidden rounded-lg'
        elevation={1}
      >
        {/* <Image
          source={{ uri: item.cover }}
          className='h-40 w-40 rounded-lg'
        /> */}
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

  const getGreetingMsg = () => {
    const hour = new Date().getHours()
    switch (true) {
      case hour >= 0 && hour < 6:
        return '凌晨好'
      case hour >= 6 && hour < 12:
        return '早上好'
      case hour >= 12 && hour < 18:
        return '下午好'
      case hour >= 18 && hour < 24:
        return '晚上好'
      default:
        return '你不好'
    }
  }

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
                {getGreetingMsg()}，
                {personalInfoLoading ? '陌生人' : personalInfo?.name}
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
                  uri: personalInfo?.face,
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

        {/* 你的收藏夹 */}
        <View className='mb-6'>
          <View className='mb-2 flex-row items-center justify-between px-4'>
            <Text
              variant='titleLarge'
              style={{ fontWeight: 'bold' }}
            >
              收藏夹
            </Text>
            <TouchableOpacity
              onPress={() => {
                router.push('/library')
              }}
            >
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
        setBilibiliCookie={useAppStore.getState().setBilibiliCookie}
      />
    </View>
  )
}

export default HomePage
