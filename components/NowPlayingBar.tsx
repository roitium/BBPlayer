import { router } from 'expo-router'
import { View, Image, Text, TouchableOpacity } from 'react-native'
import { IconButton, useTheme } from 'react-native-paper'

export default function NowPlayingBar() {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      className='relative right-0 bottom-0 left-0 flex h-16 flex-row px-3 shadow-md'
      onPress={() => {
        router.push('/player')
      }}
      style={{ backgroundColor: colors.primaryContainer }}
    >
      <Image
        source={{
          uri: 'http://i2.hdslb.com/bfs/archive/1a6b02f1f4fce81ea063fd33a9793b84deaec765.jpg',
        }}
        className='h-16 w-16 '
      />
      <View className='ml-3 flex-1 justify-center pt-3'>
        <Text
          className='font-medium'
          style={{ color: colors.onPrimaryContainer }}
        >
          Summer Memories
        </Text>
        <Text
          className='text-xs'
          style={{ color: colors.secondary }}
        >
          Cloudscape
        </Text>
      </View>
      <IconButton
        icon='play-circle'
        iconColor={colors.primary}
        size={36}
        onPress={() => {}}
      />
    </TouchableOpacity>
  )
}
