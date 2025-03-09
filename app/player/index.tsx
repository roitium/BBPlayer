import { router, Stack } from 'expo-router'
import { useState, useRef, useEffect } from 'react'
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native'
import {
  IconButton,
  Text,
  useTheme,
  Surface,
  Menu,
  Divider,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  usePlayerStore,
  usePlaybackProgress,
  usePlaybackStateHook,
} from '@/lib/store/usePlayerStore'

export default function PlayerPage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = Dimensions.get('window')

  // 从播放器store获取状态和方法
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    repeatMode,
    shuffleMode,
    togglePlay,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleRepeatMode,
    toggleShuffleMode,
  } = usePlayerStore()

  // 获取播放进度
  const { position, duration } = usePlaybackProgress()

  // 获取播放状态
  const playbackState = usePlaybackStateHook()

  // 本地状态
  const [isFavorite, setIsFavorite] = useState(false)
  const [viewMode, setViewMode] = useState('cover') // 'cover' or 'lyrics'
  const [menuVisible, setMenuVisible] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)

  // 更新滑块值
  useEffect(() => {
    if (duration > 0) {
      setSliderValue(position / duration)
    }
  }, [position, duration])

  // 动画值
  const scrollY = useRef(new Animated.Value(0)).current
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // 切换视图模式 - 暂时只支持封面模式
  const toggleViewMode = () => {
    setViewMode('cover') // 暂时只支持封面模式
  }

  // 如果没有当前曲目，显示空状态
  if (!currentTrack) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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

  // 切换重复模式
  const cycleRepeatMode = () => {
    toggleRepeatMode()
  }

  // 处理滑块变化
  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    seekTo(value * duration)
  }

  // 使用自定义进度条替代Slider组件
  const renderProgressBar = () => {
    return (
      <View className='mt-4'>
        <View
          className='h-1 w-full overflow-hidden rounded-full'
          style={{ backgroundColor: colors.surfaceVariant }}
        >
          <View
            className='h-full rounded-full'
            style={{
              backgroundColor: colors.primary,
              width: `${(position / duration) * 100}%`,
            }}
          />
        </View>
        <View className='mt-1 flex-row justify-between'>
          <Text
            variant='bodySmall'
            style={{ color: colors.onSurfaceVariant }}
          >
            {formatTime(position)}
          </Text>
          <Text
            variant='bodySmall'
            style={{ color: colors.onSurfaceVariant }}
          >
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View
      className='flex-1'
      style={{ backgroundColor: colors.background }}
    >
      <Stack.Screen
        options={{ animation: 'slide_from_bottom', headerShown: false }}
      />

      {/* 背景图片（模糊效果） */}
      <View className='absolute h-full w-full'>
        <Image
          source={{ uri: currentTrack.cover }}
          className='h-full w-full'
          style={{ opacity: 0.3 }}
          blurRadius={25}
        />
        <View
          className='absolute h-full w-full'
          style={{ backgroundColor: colors.background, opacity: 0.7 }}
        />
      </View>

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
      <ScrollView
        className='flex-1'
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 24,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
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
        <View className='items-center justify-center px-8 py-6'>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toggleViewMode}
          >
            <Surface
              className='overflow-hidden rounded-2xl'
              elevation={5}
            >
              <Image
                source={{ uri: currentTrack.cover }}
                style={{ width: screenWidth - 80, height: screenWidth - 80 }}
                className='rounded-2xl'
              />
            </Surface>
          </TouchableOpacity>
        </View>

        {/* 歌曲信息 */}
        <View className='px-6'>
          <View className='flex-row items-center justify-between'>
            <View className='flex-1'>
              <Text
                variant='headlineSmall'
                style={{ fontWeight: 'bold' }}
                numberOfLines={1}
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

          {/* 进度条 - 使用自定义进度条替代Slider */}
          {renderProgressBar()}

          {/* 播放控制 */}
          <View className='mt-6 flex-row items-center justify-between'>
            <IconButton
              icon={shuffleMode ? 'shuffle-variant' : 'shuffle-disabled'}
              size={24}
              iconColor={shuffleMode ? colors.primary : colors.onSurfaceVariant}
              onPress={toggleShuffleMode}
            />
            <IconButton
              icon='skip-previous'
              size={32}
              onPress={skipToPrevious}
            />
            <TouchableOpacity
              className='items-center justify-center rounded-full p-2'
              style={{ backgroundColor: colors.primaryContainer }}
              onPress={togglePlay}
            >
              <IconButton
                icon={isPlaying ? 'pause' : 'play'}
                size={36}
                iconColor={colors.primary}
                onPress={togglePlay}
              />
            </TouchableOpacity>
            <IconButton
              icon='skip-next'
              size={32}
              onPress={skipToNext}
            />
            <IconButton
              icon={
                repeatMode === 'off'
                  ? 'repeat-off'
                  : repeatMode === 'track'
                    ? 'repeat-once'
                    : 'repeat'
              }
              size={24}
              iconColor={
                repeatMode !== 'off' ? colors.primary : colors.onSurfaceVariant
              }
              onPress={cycleRepeatMode}
            />
          </View>
        </View>
      </ScrollView>

      {/* 菜单 */}
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
    </View>
  )
}
