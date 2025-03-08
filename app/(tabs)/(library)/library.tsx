import { useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import {
  Text,
  SegmentedButtons,
  List,
  IconButton,
  Surface,
} from 'react-native-paper'

// 模拟数据
const downloadedMusic = [
  { id: 1, title: '晴天', artist: '周杰伦', album: '叶惠美' },
  { id: 2, title: '稻香', artist: '周杰伦', album: '魔杰座' },
  { id: 3, title: '告白气球', artist: '周杰伦', album: '周杰伦的床边故事' },
]

const favoriteMusic = [
  { id: 1, title: '夜曲', artist: '周杰伦', album: '十一月的萧邦' },
  { id: 2, title: '七里香', artist: '周杰伦', album: '七里香' },
  { id: 3, title: '青花瓷', artist: '周杰伦', album: '我很忙' },
]

export default function LibraryScreen() {
  const [value, setValue] = useState('downloaded')

  const renderMusicList = (musicList: typeof downloadedMusic) => {
    return musicList.map((music) => (
      <Surface
        key={music.id}
        className='mb-2 rounded-lg'
      >
        <List.Item
          title={music.title}
          description={`${music.artist} · ${music.album}`}
          left={(props) => (
            <List.Icon
              {...props}
              icon='music'
            />
          )}
          right={(props) => (
            <View className='flex-row items-center'>
              <IconButton
                icon='play'
                onPress={() => {}}
              />
              <IconButton
                icon='dots-vertical'
                onPress={() => {}}
              />
            </View>
          )}
          className='bg-white dark:bg-gray-800'
        />
      </Surface>
    ))
  }

  return (
    <View className='flex-1 bg-gray-100 dark:bg-gray-900'>
      <View className='px-4 pt-4'>
        <SegmentedButtons
          value={value}
          onValueChange={setValue}
          buttons={[
            { value: 'downloaded', label: '下载音乐' },
            { value: 'favorite', label: '收藏音乐' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView className='flex-1 px-4'>
        {value === 'downloaded' ? (
          <>
            <Text
              variant='titleMedium'
              className='mb-4'
            >
              已下载的音乐
            </Text>
            {renderMusicList(downloadedMusic)}
          </>
        ) : (
          <>
            <Text
              variant='titleMedium'
              className='mb-4'
            >
              收藏的音乐
            </Text>
            {renderMusicList(favoriteMusic)}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  segmentedButtons: {
    marginBottom: 16,
  },
})
