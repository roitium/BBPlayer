import { Image } from 'expo-image'
import { memo } from 'react'
import { View } from 'react-native'
import { Divider, IconButton, Text } from 'react-native-paper'

interface PlaylistHeaderProps {
  coverUri: string | undefined
  title: string | undefined
  subtitle: string | undefined // 通常格式： "Author • n Tracks"
  description: string | undefined
  onPlayAll: () => void
}

/**
 * 可复用的播放列表头部组件。
 */
export const PlaylistHeader = memo(function PlaylistHeader({
  coverUri,
  title,
  subtitle,
  description,
  onPlayAll,
}: PlaylistHeaderProps) {
  if (!coverUri || !title) return null
  return (
    <View style={{ position: 'relative', flexDirection: 'column' }}>
      {/* 收藏夹信息 */}
      <View style={{ flexDirection: 'row', padding: 16 }}>
        <Image
          source={{ uri: coverUri }}
          style={{ width: 120, height: 120, borderRadius: 8 }}
        />
        <View style={{ marginLeft: 16, flex: 1, justifyContent: 'center' }}>
          <Text
            variant='titleLarge'
            style={{ fontWeight: 'bold' }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            variant='bodyMedium'
            numberOfLines={1}
          >
            {subtitle || ''}
          </Text>
        </View>
      </View>

      {/* 描述和操作按钮 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <Text
          variant='bodyMedium'
          style={{ maxWidth: 300 }}
        >
          {description || '还没有简介哦~'}
        </Text>

        <IconButton
          mode='contained'
          icon='play'
          onPress={() => onPlayAll()}
        />
      </View>

      <Divider />
    </View>
  )
})
