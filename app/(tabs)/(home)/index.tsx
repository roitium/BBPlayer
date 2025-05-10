import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { memo, useCallback, useEffect, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  ActivityIndicator,
  Avatar,
  Button,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import {
  favoriteListQueryKeys,
  useGetFavoritePlaylists,
} from '@/hooks/queries/bilibili/useFavoriteData'
import {
  usePersonalInformation,
  useRecentlyPlayed,
  userQueryKeys,
} from '@/hooks/queries/bilibili/useUserData'
import useAppStore from '@/hooks/stores/useAppStore'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Playlist, Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatDurationToHHMMSS } from '@/utils/times'
import Toast from '@/utils/toast'

const homeLog = log.extend('HOME')

function HomePage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const bilibiliCookie = useAppStore((state) => state.bilibiliCookie)
  const bilibiliApi = useAppStore((store) => store.bilibiliApi)
  const [setCookieDialogVisible, setSetCookieDialogVisible] = useState(false)
  const [greeting, setGreeting] = useState('')

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

  const getGreetingMsg = useCallback(() => {
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 6) return '凌晨好'
    if (hour >= 6 && hour < 12) return '早上好'
    if (hour >= 12 && hour < 18) return '下午好'
    if (hour >= 18 && hour < 24) return '晚上好'
    return '你好'
  }, [])

  useEffect(() => {
    setGreeting(getGreetingMsg())
  }, [getGreetingMsg])

  useEffect(() => {
    if (!bilibiliCookie) {
      Toast.warning('看起来你还没设置 Cookie，请先设置一下吧！')
      setSetCookieDialogVisible(true)
    }
  }, [bilibiliCookie])

  const limitedRecentlyPlayed = recentlyPlayed?.slice(0, 20)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingBottom: 80 }}>
        {/*顶部欢迎区域*/}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + 8,
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
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
                {greeting}，
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
                    : // eslint-disable-next-line @typescript-eslint/no-require-imports
                      require('@/assets/images/bilibili-default-avatar.jpg')
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 16, marginBottom: 24 }}>
          <FavoriteList />
        </View>
        {/* Recently Played (Uses FlatList) */}
        <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
          <RecentlyPlayed
            data={limitedRecentlyPlayed}
            isPending={recentlyPlayedPending}
            isError={recentlyPlayedError}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
            refetch={recentlyPlayedRefetch}
          />
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <NowPlayingBar />
      </View>

      <SetCookieDialog
        visible={setCookieDialogVisible}
        setVisible={setSetCookieDialogVisible}
      />
    </View>
  )
}

function SetCookieDialog({
  visible,
  setVisible,
}: {
  visible: boolean
  setVisible: (visible: boolean) => void
}) {
  const queryClient = useQueryClient()
  const cookie = useAppStore((state) => state.bilibiliCookie)
  const [inputCookie, setInputCookie] = useState(cookie)
  const setBilibiliCookie = useAppStore((state) => state.setBilibiliCookie)
  const sendPlayHistory = useAppStore((state) => state.settings.sendPlayHistory)
  const setSendPlayHistory = useAppStore((state) => state.setSendPlayHistory)
  const [inputPlayHistory, setInputPlayHistory] = useState(sendPlayHistory)
  const handleConfirm = () => {
    if (inputCookie === cookie) {
      setVisible(false)
      setSendPlayHistory(inputPlayHistory)
      return
    }
    setSendPlayHistory(inputPlayHistory)
    setBilibiliCookie(inputCookie)
    setVisible(false)
    // 刷新所有 b 站个人和收藏夹相关请求
    queryClient.refetchQueries({ queryKey: favoriteListQueryKeys.all })
    queryClient.refetchQueries({ queryKey: userQueryKeys.all })
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
          value={inputCookie}
          onChangeText={setInputCookie}
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
        <Divider style={{ marginTop: 16, marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text>向 bilibili 上报观看进度</Text>
          <Switch
            value={inputPlayHistory}
            onValueChange={setInputPlayHistory}
          />
        </View>
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
      style={{
        marginVertical: 8,
        marginRight: 16,
        width: 160,
        overflow: 'hidden',
        borderRadius: 8,
        padding: 8,
      }}
      elevation={1}
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

function FavoriteList() {
  const { colors } = useTheme()
  const bilibiliApi = useAppStore((state) => state.bilibiliApi)
  const { data: personalInfo } = usePersonalInformation(bilibiliApi)
  const {
    data: playlists,
    isPending: playlistsPending,
    isError: playlistsError,
  } = useGetFavoritePlaylists(bilibiliApi, personalInfo?.mid)

  const handleViewAll = () => {
    router.push('/library')
  }

  const filteredData = playlists?.filter(
    (item) => !item.title.startsWith('[mp]'),
  )

  return (
    <>
      <View
        style={{
          // marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
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
      {playlistsPending ? (
        <ActivityIndicator style={{ marginTop: 10, marginBottom: 10 }} />
      ) : playlistsError ? (
        <Text
          style={{ textAlign: 'center', color: 'red', paddingHorizontal: 16 }}
        >
          加载收藏夹失败
        </Text>
      ) : !playlists || playlists.length === 0 ? (
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
      <View
        style={{
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
      style={{ marginBottom: 8 }}
      activeOpacity={0.7}
      onPress={() => playSingleTrack(item)}
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
            transition={300}
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text
              variant='titleMedium'
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant='bodySmall'>{item.artist}</Text>
              {item.duration != null && item.duration > 0 && (
                <>
                  <Text
                    style={{ marginHorizontal: 4 }}
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
                playSingleTrack(item).catch((error) => {
                  homeLog.sentry('播放单曲失败', error)
                })
                handleDismissMenu()
              }}
              title='立即播放'
            />
            <Menu.Item
              leadingIcon='playlist-play'
              onPress={() => {
                playNext(item).catch((error) => {
                  homeLog.sentry('添加到队列失败', error)
                })
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
