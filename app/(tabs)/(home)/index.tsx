import Image from '@d11/react-native-fast-image'
import { router } from 'expo-router'
import { memo, useCallback, useState } from 'react'
import {
  // RefreshControl, // Removed RefreshControl
  FlatList,
  RefreshControl, // Keep FlatList
  ScrollView,
  TouchableOpacity,
  // ScrollView, // Removed ScrollView
  View,
} from 'react-native'
import {
  ActivityIndicator,
  Avatar,
  Button,
  Chip,
  Dialog,
  IconButton,
  Menu,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import { useGetFavoritePlaylists } from '@/hooks/queries/useFavoriteData'
import {
  usePersonalInformation,
  useRecentlyPlayed,
} from '@/hooks/queries/useUserData'
import useAppStore from '@/lib/store/useAppStore'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Playlist, Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'

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
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const bilibiliCookie = useAppStore((state) => state.bilibiliCookie)
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const [setCookieDialogVisible, setSetCookieDialogVisible] = useState(false)
  const [cookie, setCookie] = useState(bilibiliCookie)

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
  } = useGetFavoritePlaylists(bilibiliApi, personalInfo?.mid)

  // Removed onRefresh handler

  const getGreetingMsg = () => {
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 6) return '凌晨好'
    if (hour >= 6 && hour < 12) return '早上好'
    if (hour >= 12 && hour < 18) return '下午好'
    if (hour >= 18 && hour < 24) return '晚上好'
    return '你好'
  }

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      <View className='flex-1 pb-[80px]'>
        {/*顶部欢迎区域*/}
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
                {personalInfoPending || personalInfoError || !personalInfo
                  ? '陌生人'
                  : personalInfo.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSetCookieDialogVisible(true)}>
              <Avatar.Image
                size={40}
                source={
                  !personalInfoPending &&
                  !personalInfoError &&
                  personalInfo?.face
                    ? { uri: personalInfo.face }
                    : require('@/assets/images/bilibili-default-avatar.jpg')
                }
              />
            </TouchableOpacity>
          </View>
        </View>

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
                onPress={() => {
                  homeLog.info(`Category pressed: ${category.name}`)
                }}
                style={{ marginRight: 8 }}
                mode='outlined'
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
        <View className='mb-6'>
          <FavoriteList
            data={playlists}
            isPending={playlistsPending}
            isError={playlistsError}
          />
        </View>
        {/* Recently Played (Uses FlatList) */}
        <View className='mb-6 px-4'>
          <RecentlyPlayed
            data={recentlyPlayed}
            isPending={recentlyPlayedPending}
            isError={recentlyPlayedError}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
            refetch={recentlyPlayedRefetch}
          />
        </View>
      </View>

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
  const handleConfirm = () => {
    setBilibiliCookie(cookie)
    setVisible(false)
  }

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
          mode='outlined'
          numberOfLines={5}
          multiline
          style={{ maxHeight: 200 }}
          textAlignVertical='top'
        />
        <Text
          variant='bodySmall'
          style={{ marginTop: 8 }}
        >
          请在此处粘贴您的 Bilibili Cookie 以获取个人数据。
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={() => setVisible(false)}>取消</Button>
        <Button onPress={handleConfirm}>确定</Button>
      </Dialog.Actions>
    </Dialog>
  )
}

function PlaylistItem({ item }: { item: Playlist }) {
  const handlePress = () => {
    router.push(`/playlist/favorite/${item.id}`)
  }

  return (
    <Surface
      className='my-2 mr-4 w-40 overflow-hidden'
      elevation={1}
      style={{ borderRadius: 8, padding: 8 }}
    >
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.5}
        onPress={handlePress}
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
  isError,
}: {
  data?: Playlist[]
  isPending: boolean
  isError: boolean
}) {
  const { colors } = useTheme()

  const handleViewAll = () => {
    router.push('/library')
  }

  const filteredData = data?.filter((item) => !item.title.startsWith('[mp]'))

  return (
    <>
      <View className='mb-2 flex-row items-center justify-between px-4'>
        <Text
          variant='titleLarge'
          style={{ fontWeight: 'bold' }}
        >
          收藏夹
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text
            variant='labelLarge'
            style={{ color: colors.primary }}
          >
            查看全部
          </Text>
        </TouchableOpacity>
      </View>
      {isPending ? (
        <ActivityIndicator style={{ marginTop: 10, marginBottom: 10 }} />
      ) : isError ? (
        <Text
          style={{ textAlign: 'center', color: 'red', paddingHorizontal: 16 }}
        >
          加载收藏夹失败
        </Text>
      ) : !data || data.length === 0 ? (
        <Text
          style={{ textAlign: 'center', color: 'grey', paddingHorizontal: 16 }}
        >
          暂无收藏夹
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
        >
          {filteredData?.map((item) => (
            <PlaylistItem
              key={item.id.toString()}
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
  isError,
  menuVisible,
  setMenuVisible,
  refetch,
}: {
  data?: Track[]
  isPending: boolean
  isError: boolean
  menuVisible: string | null
  setMenuVisible: (visible: string | null) => void
  refetch: () => void
}) {
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)

  const canShow = refreshing || isPending

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <RecentlyPlayedItem
        item={item}
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
      />
    ),
    [menuVisible, setMenuVisible],
  )

  const keyExtractor = useCallback((item: Track) => item.id, [])

  const estimatedItemHeight = 72
  const flatListHeight = estimatedItemHeight * 3 + 30

  return (
    <>
      {/* Header */}
      <View className='mb-2 flex-row items-center justify-between'>
        <Text
          variant='titleLarge'
          style={{ fontWeight: 'bold' }}
        >
          最近播放
        </Text>
        <TouchableOpacity
          onPress={() => homeLog.info('View All Recently Played pressed')}
        >
          <Text
            variant='labelLarge'
            style={{ color: colors.primary }}
          >
            查看全部
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {canShow ? (
        <ActivityIndicator style={{ marginTop: 10, marginBottom: 10 }} />
      ) : isError ? (
        <Text style={{ textAlign: 'center', color: 'red' }}>
          加载最近播放失败
        </Text>
      ) : !data || data.length === 0 ? (
        <Text style={{ textAlign: 'center', color: 'grey' }}>暂无播放记录</Text>
      ) : (
        <View
          style={{
            height: flatListHeight,
            borderRadius: 8,
            borderColor: colors.surfaceVariant,
            borderWidth: 1,
          }}
        >
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            extraData={menuVisible}
            contentContainerStyle={{
              paddingBottom: 8,
              paddingLeft: 4,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isPending}
                onRefresh={async () => {
                  setRefreshing(true)
                  await refetch()
                  setRefreshing(false)
                }}
                colors={[colors.primary]}
                progressViewOffset={50}
              />
            }
          />
        </View>
      )}
    </>
  )
}

const RecentlyPlayedItem = memo(function RecentlyPlayedItem({
  item,
  menuVisible,
  setMenuVisible,
}: {
  item: Track
  menuVisible: string | null
  setMenuVisible: (visible: string | null) => void
}) {
  const playSingleTrack = async (track: Track) => {
    try {
      await usePlayerStore.getState().addToQueue({
        tracks: [track],
        playNow: true,
        clearQueue: true,
        playNext: false,
      })
    } catch (error) {
      homeLog.sentry('播放单曲失败', error)
    }
  }

  const playNext = async (track: Track) => {
    try {
      await usePlayerStore.getState().addToQueue({
        tracks: [track],
        playNow: false,
        clearQueue: false,
        playNext: true,
      })
    } catch (error) {
      homeLog.sentry('添加到队列失败', error)
    }
  }

  const handleDismissMenu = () => setMenuVisible(null)
  const handleOpenMenu = () => setMenuVisible(item.id.toString())

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
              {item.duration != null && item.duration > 0 && (
                <>
                  <Text
                    className='mx-1'
                    variant='bodySmall'
                  >
                    •
                  </Text>
                  <Text variant='bodySmall'>
                    {formatDurationToHHMMSS(item.duration)}
                  </Text>
                </>
              )}
            </View>
          </View>
          <Menu
            visible={menuVisible === item.id.toString()}
            onDismiss={handleDismissMenu}
            anchor={
              <IconButton
                icon='dots-vertical'
                size={24}
                onPress={handleOpenMenu}
              />
            }
            anchorPosition='bottom'
          >
            <Menu.Item
              leadingIcon='play-circle-outline'
              onPress={() => {
                playSingleTrack(item)
                handleDismissMenu()
              }}
              title='立即播放'
            />
            <Menu.Item
              leadingIcon='playlist-play'
              onPress={() => {
                playNext(item)
                handleDismissMenu()
              }}
              title='下一首播放'
            />
          </Menu>
        </View>
      </Surface>
    </TouchableOpacity>
  )
})

export default HomePage
