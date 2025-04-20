import NowPlayingBar from '@/components/NowPlayingBar'
import {
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import Image from '@d11/react-native-fast-image'
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
  ActivityIndicator,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import type { Track, Playlist } from '@/types/core/media'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import useAppStore from '@/lib/store/useAppStore'
import { router } from 'expo-router'
import { formatDurationToHHMMSS } from '@/utils/times'
import {
  usePersonalInformation,
  useRecentlyPlayed,
} from '@/hooks/queries/useUserData'
import { useGetFavoritePlaylists } from '@/hooks/queries/useFavoriteData'
import log from '@/utils/log'

const homeLog = log.extend('HOME')

const mockCategories = [
  { id: '1', name: '翻唱', icon: 'music-note' },
  { id: '2', name: 'VOCALOID', icon: 'music-note' },
  { id: '3', name: '人力音MAD', icon: 'music-note' },
  { id: '4', name: '原创', icon: 'music-note' },
  { id: '5', name: 'OST', icon: 'music-note' },
]

function HomePage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const bilibiliCookie = useAppStore((state) => state.bilibiliCookie)
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const [setCookieDialogVisible, setSetCookieDialogVisible] = useState(false)
  const [cookie, setCookie] = useState(bilibiliCookie)
  const [slicedRecentlyPlayed, setSlicedRecentlyPlayed] = useState<Track[]>([])

  const {
    data: personalInfo,
    isPending: personalInfoPending,
    isError: personalInfoError,
  } = usePersonalInformation(bilibiliApi)

  const {
    data: recentlyPlayed,
    isPending: recentlyPlayedPending,
    isError: recentlyPlayedError,
    refetch: recentlyPlayedRefetch,
  } = useRecentlyPlayed(bilibiliApi)

  const {
    data: playlists,
    isPending: playlistsPending,
    isError: playlistsError,
    refetch: playlistsRefetch,
  } = useGetFavoritePlaylists(bilibiliApi, personalInfo?.mid)

  useEffect(() => {
    if (!recentlyPlayedPending && !recentlyPlayedError && recentlyPlayed) {
      setSlicedRecentlyPlayed(recentlyPlayed.slice(0, 10))
    }
  }, [recentlyPlayed, recentlyPlayedPending, recentlyPlayedError])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([recentlyPlayedRefetch(), playlistsRefetch()])
    setRefreshing(false)
  }

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
                {personalInfoPending || personalInfoError
                  ? '陌生人'
                  : personalInfo.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSetCookieDialogVisible(true)
              }}
            >
              <Avatar.Image
                size={40}
                source={
                  !personalInfoPending && !personalInfoError
                    ? {
                        uri: personalInfo.face,
                      }
                    : require('@/assets/images/bilibili-default-avatar.jpg')
                }
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

        {/* 收藏夹 */}
        <View className='mb-6'>
          <FavoriteList
            data={playlists}
            isPending={playlistsPending}
          />
        </View>

        {/* 最近播放 */}
        <View className='mb-6 px-4'>
          <RecentlyPlayed
            data={slicedRecentlyPlayed}
            isPending={recentlyPlayedPending}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
          />
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

function SetCookieDialog({
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
}) {
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

function PlaylistItem({
  item,
}: {
  item: Playlist
}) {
  return (
    <Surface
      className='my-2 mr-4 w-40 overflow-hidden'
      elevation={1}
      style={{ borderRadius: 8, padding: 8 }}
    >
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.5}
        onPress={() => {
          router.push(`/playlist/favorite/${item.id}`)
        }}
      >
        <Text
          variant='titleSmall'
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text variant='bodySmall'>{item.count} 首歌曲</Text>
      </TouchableOpacity>
    </Surface>
  )
}

function FavoriteList({
  data,
  isPending,
}: { data?: Playlist[]; isPending: boolean }) {
  const { colors } = useTheme()
  return (
    <>
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
      {isPending ? (
        <ActivityIndicator />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
        >
          {data?.map((item) => (
            <PlaylistItem
              key={item.id}
              item={item}
            />
          ))}
        </ScrollView>
      )}
    </>
  )
}

function RecentlyPlayed({
  data,
  isPending,
  menuVisible,
  setMenuVisible,
}: {
  data?: Track[]
  isPending: boolean
  menuVisible: string | null
  setMenuVisible: (visible: string | null) => void
}) {
  const { colors } = useTheme()
  return (
    <>
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
      {isPending ? (
        <ActivityIndicator />
      ) : (
        data?.map((item) => (
          <RecentlyPlayedItem
            key={item.id}
            item={item}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
          />
        ))
      )}
    </>
  )
}

// 渲染最近播放项
function RecentlyPlayedItem({
  item,
  menuVisible,
  setMenuVisible,
}: {
  item: Track
  menuVisible: string | null
  setMenuVisible: (visible: string | null) => void
}) {
  // 播放单曲（清空队列后播放）
  const playSingleTrack = async (track: Track) => {
    try {
      await usePlayerStore.getState().addToQueue([track], true, true)
    } catch (error) {
      homeLog.sentry('播放单曲失败', error)
    }
  }

  // 下一首播放
  const playNext = async (track: Track) => {
    try {
      await usePlayerStore
        .getState()
        .addToQueue([track], false, false, undefined, true)
    } catch (error) {
      homeLog.sentry('添加到队列失败', error)
    }
  }

  return (
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
            style={{ width: 48, height: 48, borderRadius: 4 }}
          />
          <View className='ml-3 flex-1'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
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
              leadingIcon='play-circle'
              onPress={() => playSingleTrack(item)}
              title='立即播放'
            />
            <Menu.Item
              leadingIcon='playlist-plus'
              onPress={() => playNext(item)}
              title='添加到播放队列'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableOpacity>
  )
}

export default HomePage
