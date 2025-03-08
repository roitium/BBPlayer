import { router, Stack } from 'expo-router'
import { useState, useRef } from 'react'
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

export default function PlayerPage() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = Dimensions.get('window')

  // 状态
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off', 'all', 'one'
  const [shuffleMode, setShuffleMode] = useState(false)
  const [viewMode, setViewMode] = useState('cover') // 'cover' or 'lyrics'
  const [currentTime, setCurrentTime] = useState(85) // seconds
  const [duration, setDuration] = useState(255) // seconds
  const [menuVisible, setMenuVisible] = useState(false)
  const [sliderValue, setSliderValue] = useState(currentTime / duration)

  // 动画值
  const scrollY = useRef(new Animated.Value(0)).current
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  // 模拟歌曲数据
  const songData = {
    id: '1',
    title: '夏日漫步',
    artist: '陈绮贞',
    album: '华语经典',
    cover:
      'http://i1.hdslb.com/bfs/archive/c2c74deabe26d62c1fb50c36f1fed8d562ed3338.jpg',
    source: 'bilibili',
    lyrics: [
      { id: 'lyric_1', time: 0, text: '[音乐前奏]' },
      { id: 'lyric_2', time: 15, text: '漫步在夏日的街头' },
      { id: 'lyric_3', time: 30, text: '感受微风拂过我的脸' },
      { id: 'lyric_4', time: 45, text: '阳光洒在肩膀上' },
      { id: 'lyric_5', time: 60, text: '这一刻如此美好' },
      { id: 'lyric_6', time: 75, text: '海浪轻轻拍打' },
      { id: 'lyric_7', time: 90, text: '金色的沙滩' },
      { id: 'lyric_8', time: 105, text: '夏日的记忆' },
      { id: 'lyric_9', time: 120, text: '永远留存' },
      { id: 'lyric_10', time: 135, text: '[间奏]' },
      { id: 'lyric_11', time: 165, text: '沙滩漫步与日落' },
      { id: 'lyric_12', time: 180, text: '创造永恒的回忆' },
      { id: 'lyric_13', time: 195, text: '在夏日的温暖中' },
      { id: 'lyric_14', time: 210, text: '完美的一天' },
      { id: 'lyric_15', time: 225, text: '完美的一天...' },
    ],
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // 查找当前歌词
  const getCurrentLyric = () => {
    for (let i = songData.lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= songData.lyrics[i].time) {
        return i
      }
    }
    return 0
  }

  const currentLyricIndex = getCurrentLyric()

  // 切换重复模式
  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all')
    else if (repeatMode === 'all') setRepeatMode('one')
    else setRepeatMode('off')
  }

  // 切换视图模式
  const toggleViewMode = () => {
    setViewMode(viewMode === 'cover' ? 'lyrics' : 'cover')
  }

  // 处理滑块变化
  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    setCurrentTime(value * duration)
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
              width: `${(currentTime / duration) * 100}%`,
            }}
          />
        </View>
        <View className='mt-1 flex-row justify-between'>
          <Text
            variant='bodySmall'
            style={{ color: colors.onSurfaceVariant }}
          >
            {formatTime(currentTime)}
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
          source={{ uri: songData.cover }}
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
            {songData.title}
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
                source={{ uri: songData.cover }}
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
                {songData.title}
              </Text>
              <Text
                variant='titleSmall'
                style={{ color: colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {songData.artist} · {songData.album}
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
              onPress={() => setShuffleMode(!shuffleMode)}
            />
            <IconButton
              icon='skip-previous'
              size={32}
              onPress={() => {}}
            />
            <TouchableOpacity
              className='items-center justify-center rounded-full p-2'
              style={{ backgroundColor: colors.primaryContainer }}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <IconButton
                icon={isPlaying ? 'pause' : 'play'}
                size={36}
                iconColor={colors.primary}
                onPress={() => setIsPlaying(!isPlaying)}
              />
            </TouchableOpacity>
            <IconButton
              icon='skip-next'
              size={32}
              onPress={() => {}}
            />
            <IconButton
              icon={
                repeatMode === 'off'
                  ? 'repeat-off'
                  : repeatMode === 'one'
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

        {/* 歌词区域 */}
        {viewMode === 'lyrics' && (
          <View className='mt-8 px-6'>
            <Text
              variant='titleMedium'
              className='mb-4 text-center'
              style={{ fontWeight: 'bold' }}
            >
              歌词
            </Text>
            <View className='mb-8'>
              {songData.lyrics.map((line, index) => (
                <View
                  key={line.id}
                  className='py-2'
                >
                  <Text
                    className='text-center'
                    variant={
                      index === currentLyricIndex ? 'titleMedium' : 'bodyMedium'
                    }
                    style={{
                      color:
                        index === currentLyricIndex
                          ? colors.primary
                          : colors.onSurfaceVariant,
                      fontWeight:
                        index === currentLyricIndex ? 'bold' : 'normal',
                      opacity: index === currentLyricIndex ? 1 : 0.7,
                    }}
                  >
                    {line.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
