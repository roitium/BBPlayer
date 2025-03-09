import { View, ScrollView } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import { router } from 'expo-router'
import { useState } from 'react'
import type { Track } from '@/types/core/media'

export default function TestPage() {
  const { addToQueue, clearQueue, queue } = usePlayerStore()
  const [loading, setLoading] = useState(false)

  // 测试曲目
  const testTracks: Track[] = [
    {
      id: 'BV1m34y1M7pG',
      title: '若能化为星座',
      artist: '孤独摇滚',
      cover:
        'https://i2.hdslb.com/bfs/archive/67101d909983ae1a5de3637c01ab8c1b4ec3e6e5.jpg',
      source: 'bilibili',
      duration: 199,
      createTime: Date.now(),
    },
    {
      id: 'BV1F24y1y7By',
      title: '林俊杰 - 江南',
      artist: '林俊杰',
      cover:
        'https://i0.hdslb.com/bfs/archive/a5fb7753912b10c8e2464cc6c8f3741a2c35ff0a.jpg',
      source: 'bilibili',
      duration: 256,
      createTime: Date.now(),
    },
  ]

  // 播放测试曲目
  const handlePlayTrack = async (track: Track) => {
    try {
      setLoading(true)
      await addToQueue([track])
      router.push('/player')
    } catch (error) {
      console.error('播放失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 添加到队列
  const handleAddToQueue = async () => {
    try {
      setLoading(true)
      await addToQueue(testTracks)
    } catch (error) {
      console.error('添加到队列失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 清空队列
  const handleClearQueue = async () => {
    try {
      setLoading(true)
      await clearQueue()
    } catch (error) {
      console.error('清空队列失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView className='flex-1 p-4'>
      <Text
        variant='headlineMedium'
        className='mb-4'
      >
        音频播放测试
      </Text>

      <View className='mb-4'>
        <Button
          mode='contained'
          onPress={handleAddToQueue}
          loading={loading}
          className='mb-2'
        >
          添加测试曲目到队列
        </Button>
        <Button
          mode='outlined'
          onPress={handleClearQueue}
          loading={loading}
          className='mb-2'
        >
          清空队列
        </Button>
        <Button
          mode='outlined'
          onPress={() => router.push('/player')}
          className='mb-2'
        >
          打开播放器
        </Button>
      </View>

      <Text
        variant='titleMedium'
        className='mb-2'
      >
        测试曲目:
      </Text>
      {testTracks.map((track) => (
        <Card
          key={track.id}
          className='mb-2'
        >
          <Card.Cover source={{ uri: track.cover }} />
          <Card.Title
            title={track.title}
            subtitle={track.artist}
          />
          <Card.Actions>
            <Button
              onPress={() => handlePlayTrack(track)}
              loading={loading}
            >
              播放
            </Button>
          </Card.Actions>
        </Card>
      ))}

      <Text
        variant='titleMedium'
        className='mt-4 mb-2'
      >
        当前队列 ({queue.length}):
      </Text>
      {queue.map((track) => (
        <Card
          key={track.id}
          className='mb-2'
        >
          <Card.Title
            title={track.title}
            subtitle={track.artist}
          />
          <Card.Actions>
            <Button
              onPress={() => handlePlayTrack(track)}
              loading={loading}
            >
              播放
            </Button>
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  )
}
