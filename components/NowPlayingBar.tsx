import { router } from 'expo-router'
import { View, Image, TouchableOpacity } from 'react-native'
import {
  IconButton,
  Text,
  Surface,
  useTheme,
  ProgressBar,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NowPlayingBar() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const isPlaying = true // 模拟播放状态

  // 模拟当前播放的歌曲数据
  const currentSong = {
    title: '夏日漫步',
    artist: '陈绮贞',
    cover:
      'http://i2.hdslb.com/bfs/archive/1a6b02f1f4fce81ea063fd33a9793b84deaec765.jpg',
    progress: 0.35, // 播放进度，0-1之间
  }

  return (
    <Surface
      className='mx-2 mb-2 overflow-hidden rounded-xl'
      elevation={2}
    >
      <TouchableOpacity
        className='relative'
        onPress={() => {
          router.push('/player')
        }}
        activeOpacity={0.9}
      >
        {/* 进度条 */}
        <ProgressBar
          progress={currentSong.progress}
          color={colors.primary}
          style={{ height: 2 }}
        />

        <View className='flex-row items-center p-2'>
          {/* 封面 */}
          <Image
            source={{ uri: currentSong.cover }}
            className='h-12 w-12 rounded-md'
          />

          {/* 歌曲信息 */}
          <View className='ml-3 flex-1 justify-center'>
            <Text
              variant='titleMedium'
              numberOfLines={1}
              style={{ color: colors.onSurface }}
            >
              {currentSong.title}
            </Text>
            <Text
              variant='bodySmall'
              numberOfLines={1}
              style={{ color: colors.onSurfaceVariant }}
            >
              {currentSong.artist}
            </Text>
          </View>

          {/* 控制按钮 */}
          <View className='flex-row items-center'>
            <IconButton
              icon='skip-previous'
              size={24}
              onPress={() => {}}
              iconColor={colors.onSurfaceVariant}
            />
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={24}
              onPress={() => {}}
              iconColor={colors.primary}
              style={{ margin: 0 }}
            />
            <IconButton
              icon='skip-next'
              size={24}
              onPress={() => {}}
              iconColor={colors.onSurfaceVariant}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  )
}
