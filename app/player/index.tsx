import { Image } from 'expo-image'
import type BottomSheet from '@gorhom/bottom-sheet'
import { router, Stack } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  type LayoutChangeEvent,
  PanResponder,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  Divider,
  IconButton,
  Menu,
  Surface,
  Text,
  Tooltip,
  useTheme,
} from 'react-native-paper'
import {
  type EdgeInsets,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { RepeatMode, State } from 'react-native-track-player'
import { useShallow } from 'zustand/react/shallow'
import PlayerQueueModal from '@/components/PlayerQueueModal'
import {
  usePlaybackProgress,
  usePlaybackStateHook,
  usePlayerStore,
} from '@/lib/store/usePlayerStore'
import { formatDurationToHHMMSS } from '@/utils/times'

function DragableProgressBar() {
  const seekTo = usePlayerStore((state) => state.seekTo)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const { position, duration } = usePlaybackProgress(300)
  const { colors } = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [localProgress, setLocalProgress] = useState(0) // 始终是一个 0-1 的值
  const progressBarRef = useRef(null)
  const progressBarWidth = useRef(0)
  const playbackState = usePlaybackStateHook()
  // 我不懂为什么，但是在 panResponder 内获取到的 duration 和 position 永远是 0，只能靠这种方法 hack 一下
  const cachedDuration = useRef(duration)
  const cachedPosition = useRef(position)

  // biome-ignore lint/correctness/useExhaustiveDependencies: 当切歌时归零进度条
  useEffect(() => {
    setLocalProgress(0)
    cachedPosition.current = 0
  }, [currentTrack])

  // 当 duration 和 position 变动时更新缓存
  useEffect(() => {
    if (duration > 0) {
      cachedDuration.current = duration
    }
    if (position > 0) {
      cachedPosition.current = position
    }
  }, [duration, position])

  // 处理拖动事件和进度条更新
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 当手势开始时，更新一遍进度，防止进度条闪烁到开头
      onPanResponderGrant: (_, gestureState) => {
        setIsDragging(true)
        setLocalProgress(cachedPosition.current / cachedDuration.current)
      },
      // 在滑动时实时更新进度，保证进度条实时更新
      onPanResponderMove: (_, gestureState) => {
        // 计算新的进度值（0-1之间）
        const newProgress = Math.max(
          0,
          Math.min(1, gestureState.moveX / progressBarWidth.current),
        )
        setLocalProgress(newProgress)
      },
      onPanResponderRelease: (_, gestureState) => {
        // 处理点击事件（10px 真的够用吗）
        if (gestureState.moveX < 10) {
          setIsDragging(false)
          return
        }
        // 计算最终进度值并应用
        const finalProgress = Math.max(
          0,
          Math.min(1, gestureState.moveX / progressBarWidth.current),
        )
        setLocalProgress(finalProgress)
        seekTo(finalProgress * cachedDuration.current)
        setIsDragging(false)
      },
      onPanResponderTerminate: () => {
        // 如果手势被中断，恢复到当前播放位置
        setIsDragging(false)
        setLocalProgress(cachedPosition.current / cachedDuration.current)
      },
    }),
  ).current

  // 当播放位置更新且不在拖动状态，且不是缓冲状态时（缓冲状态不更新，避免闪烁），更新本地进度
  // 这里不使用 cachedDuration 是因为在 useEffect 可以正确获取到 duration
  useEffect(() => {
    if (
      !isDragging &&
      duration > 0 &&
      playbackState.state !== State.Buffering
    ) {
      setLocalProgress(position / duration)
    }
  }, [position, duration, isDragging, playbackState.state])

  // 测量进度条宽度
  const onLayout = (event: LayoutChangeEvent) => {
    progressBarWidth.current = event.nativeEvent.layout.width
  }

  return (
    <View className='mt-4'>
      {/* 进度条主容器 */}
      <View
        className='h-8 w-full justify-center'
        ref={progressBarRef}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        {/* 进度条背景 */}
        <View
          className='h-1.5 w-full overflow-hidden rounded-full'
          style={{ backgroundColor: colors.surfaceVariant }}
        >
          {/* 进度条填充部分 */}
          <View
            className='h-full rounded-full'
            style={{
              backgroundColor: colors.primary,
              width: `${localProgress * 100}%`,
            }}
          />
        </View>

        {/* 拖动手柄 */}
        <TouchableOpacity
          activeOpacity={1}
          className='absolute size-4 rounded-full'
          style={{
            backgroundColor: colors.primary,
            // -0.01 是为了与进度条对齐
            left: `${(localProgress - 0.01) * 100}%`,
            // 同样是为了对齐
            top: 6,
            borderWidth: 2,
            borderColor: 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1.5,
            elevation: 2,
          }}
        />
      </View>

      {/* 时间显示 */}
      <View className='mt-1 flex-row justify-between'>
        <Text
          variant='bodySmall'
          style={{ color: colors.onSurfaceVariant }}
        >
          {formatDurationToHHMMSS(Math.trunc(localProgress * duration))}
        </Text>
        <Text
          variant='bodySmall'
          style={{ color: colors.onSurfaceVariant }}
        >
          {formatDurationToHHMMSS(Math.trunc(duration))}
        </Text>
      </View>
    </View>
  )
}

export default function PlayerPage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = Dimensions.get('window')
  const sheetRef = useRef<BottomSheet>(null)

  // 从播放器store获取状态和方法
  const { currentTrack, isPlaying, repeatMode, shuffleMode } = usePlayerStore(
    useShallow((state) => {
      return {
        currentTrack: state.currentTrack,
        isPlaying: state.isPlaying,
        repeatMode: state.repeatMode,
        shuffleMode: state.shuffleMode,
      }
    }),
  )

  // 本地状态
  const [isFavorite, setIsFavorite] = useState(false)
  const [viewMode, setViewMode] = useState('cover') // 'cover' or 'lyrics'
  const [menuVisible, setMenuVisible] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)

  // 动画值
  const scrollY = useRef(new Animated.Value(0)).current
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // 切换视图模式 - 暂时只支持封面模式
  const toggleViewMode = () => {
    setViewMode('cover') // 暂时只支持封面模式
  }

  // 如果没有当前曲目，显示空状态
  if (!currentTrack) {
    return (
      <View className='flex-1 items-center justify-center'>
        <Text>没有正在播放的曲目</Text>
        <IconButton
          icon='arrow-left'
          onPress={() => router.back()}
        />
      </View>
    )
  }

  // 当前歌词索引 - 暂不支持歌词功能
  const currentLyricIndex = 0

  return (
    <View
      className='h-full w-full'
      style={{
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <Stack.Screen
        options={{
          animation: 'slide_from_bottom',
          headerShown: false,
          animationDuration: 200,
        }}
      />

      {/* 顶部导航栏 */}
      <Animated.View
        className='absolute right-0 left-0 z-10'
        style={{
          paddingTop: insets.top,
          paddingBottom: 8,
          opacity: headerOpacity,
          backgroundColor: colors.background,
        }}
      >
        <View className='flex-row items-center justify-between px-4'>
          <IconButton
            icon='chevron-down'
            size={24}
            onPress={() => router.back()}
          />
          <Text
            variant='titleMedium'
            numberOfLines={1}
            className='flex-1 text-center'
          >
            {currentTrack.title}
          </Text>
          <IconButton
            icon='dots-vertical'
            size={24}
            onPress={() => setMenuVisible(true)}
          />
        </View>
      </Animated.View>

      {/* 主内容区域 */}
      <View className='flex flex-1 justify-between'>
        {/* 上半部分：顶部操作栏、封面和歌曲信息 */}
        <View>
          {/* 顶部操作栏 */}
          <View className='flex-row items-center justify-between px-4 py-2'>
            <IconButton
              icon='chevron-down'
              size={24}
              onPress={() => router.back()}
            />
            <Text
              variant='titleMedium'
              className='flex-1 text-center'
            >
              正在播放
            </Text>
            <IconButton
              icon='dots-vertical'
              size={24}
              onPress={() => setMenuVisible(true)}
            />
          </View>

          {/* 封面区域 */}
          <View className='items-center px-8 py-6'>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={toggleViewMode}
              className='rounded-full'
            >
              <Surface
                elevation={5}
                // 我不理解，为什么这里无法通过 className 设置
                style={{ borderRadius: 16 }}
              >
                <Image
                  source={{ uri: currentTrack.cover }}
                  style={{
                    width: screenWidth - 80,
                    height: screenWidth - 80,
                    borderRadius: 16,
                  }}
                />
              </Surface>
            </TouchableOpacity>
          </View>

          {/* 歌曲信息 */}
          <View className='px-6'>
            <View className='flex-row items-center justify-between'>
              <View className='flex-1'>
                <Text
                  variant='titleLarge'
                  style={{ fontWeight: 'bold' }}
                  numberOfLines={4}
                >
                  {currentTrack.title}
                </Text>
                <Text
                  variant='bodyMedium'
                  style={{ color: colors.onSurfaceVariant }}
                  numberOfLines={1}
                >
                  {currentTrack.artist}
                </Text>
              </View>
              <IconButton
                icon={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                iconColor={isFavorite ? colors.error : colors.onSurfaceVariant}
                onPress={() => setIsFavorite(!isFavorite)}
              />
            </View>
          </View>
        </View>

        {/* 下半部分：进度条和控制栏 */}
        <View className='px-6 pb-5'>
          {/* 进度条 */}
          <DragableProgressBar />

          {/* 播放控制 */}
          <View className='mt-6 flex-row items-center justify-center gap-10'>
            <IconButton
              icon='skip-previous'
              size={32}
              onPress={usePlayerStore.getState().skipToPrevious}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={48}
              iconColor={colors.primary}
              onPress={usePlayerStore.getState().togglePlay}
              mode='contained'
            />
            <IconButton
              icon='skip-next'
              size={32}
              onPress={usePlayerStore.getState().skipToNext}
            />
          </View>
          {/* 控制按钮部分 */}
          <View className='mt-3 flex-row items-center justify-center gap-8'>
            <Tooltip title='切换随机播放模式'>
              <IconButton
                icon={shuffleMode ? 'shuffle-variant' : 'shuffle-disabled'}
                size={24}
                iconColor={
                  shuffleMode ? colors.primary : colors.onSurfaceVariant
                }
                onPress={usePlayerStore.getState().toggleShuffleMode}
              />
            </Tooltip>
            <Tooltip title='切换循环播放模式'>
              <IconButton
                icon={
                  repeatMode === RepeatMode.Off
                    ? 'repeat-off'
                    : repeatMode === RepeatMode.Track
                      ? 'repeat-once'
                      : 'repeat'
                }
                size={24}
                iconColor={
                  repeatMode !== RepeatMode.Off
                    ? colors.primary
                    : colors.onSurfaceVariant
                }
                onPress={usePlayerStore.getState().toggleRepeatMode}
              />
            </Tooltip>
            <Tooltip title='打开播放列表'>
              <IconButton
                icon='format-list-bulleted'
                size={24}
                onPress={() => sheetRef.current?.snapToPosition('75%')}
              />
            </Tooltip>
          </View>
        </View>
      </View>

      {/* 菜单 */}
      <FunctionalMenu
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
        screenWidth={screenWidth}
        toggleViewMode={toggleViewMode}
        viewMode={viewMode}
        insets={insets}
      />

      {/* 播放列表 */}
      <PlayerQueueModal sheetRef={sheetRef} />
    </View>
  )
}

function FunctionalMenu({
  menuVisible,
  setMenuVisible,
  screenWidth,
  toggleViewMode,
  viewMode,
  insets,
}: {
  menuVisible: boolean
  setMenuVisible: (visible: boolean) => void
  screenWidth: number
  toggleViewMode: () => void
  viewMode: string
  insets: EdgeInsets
}) {
  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={{ x: screenWidth - 24, y: insets.top + 24 }}
    >
      <Menu.Item
        onPress={() => {
          setMenuVisible(false)
        }}
        title='添加到播放列表'
        leadingIcon='playlist-plus'
      />
      <Menu.Item
        onPress={() => {
          setMenuVisible(false)
        }}
        title='查看艺术家'
        leadingIcon='account-music'
      />
      <Menu.Item
        onPress={() => {
          setMenuVisible(false)
        }}
        title='查看专辑'
        leadingIcon='album'
      />
      <Divider />
      <Menu.Item
        onPress={() => {
          setMenuVisible(false)
        }}
        title='分享'
        leadingIcon='share-variant'
      />
      <Menu.Item
        onPress={() => {
          setMenuVisible(false)
          toggleViewMode()
        }}
        title={viewMode === 'cover' ? '显示歌词' : '显示封面'}
        leadingIcon={viewMode === 'cover' ? 'text' : 'image'}
      />
    </Menu>
  )
}
