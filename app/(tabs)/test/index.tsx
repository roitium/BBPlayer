import { View, ScrollView } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import type { Track } from '@/types/core/media'
import TrackPlayer from 'react-native-track-player'
import { convertToRNTPTrack } from '@/utils/player'
import * as Updates from 'expo-updates'
import { showToast } from '@/utils/toast'
import type BottomSheet from '@gorhom/bottom-sheet'
import PlayerQueueModal from '@/components/PlayerQueueModal'

export default function TestPage() {
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)
  const queue = usePlayerStore((state) => state.queue)
  const [loading, setLoading] = useState(false)
  const { currentlyRunning, isUpdateAvailable, isUpdatePending } =
    Updates.useUpdates()
  const sheetRef = useRef<BottomSheet>(null)

  const showPlayerQueueModal = () => {
    sheetRef.current?.snapToPosition('75%')
  }

  const testCheckUpdate = async () => {
    const result = await Updates.checkForUpdateAsync()
    showToast({
      severity: 'success',
      title: '检查更新结果',
      message: `isAvailable: ${result.isAvailable}, whyNotAvailable: ${result.reason}, isRollbackToEmbedding: ${result.isRollBackToEmbedded}`,
      length: 'long',
    })
  }

  const testUpdatePackage = async () => {
    if (isUpdatePending) {
      await Updates.reloadAsync()
      return
    }
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) {
      showToast({
        severity: 'error',
        title: '没有可用的更新',
        message: '当前已是最新版本',
      })
      return
    }
    const updateResult = await Updates.fetchUpdateAsync()
    if (updateResult.isNew === true) {
      showToast({
        severity: 'info',
        title: '有新版本可用',
        message: '现在更新',
      })
      setTimeout(() => {
        Updates.reloadAsync()
      }, 1000)
    }
  }

  // 测试曲目
  const testTracks: Track[] = [
    {
      id: 'BV1m34y1M7pG',
      title: '测试过期曲目',
      artist: '测试过期曲目',
      cover:
        'https://i2.hdslb.com/bfs/archive/67101d909983ae1a5de3637c01ab8c1b4ec3e6e5.jpg',
      source: 'bilibili',
      duration: 199,
      createTime: Date.now(),
      biliStreamUrl: {
        url: 'https://cn-sxty-cu-03-07.bilivideo.com/upgcxcode/82/16/26430541682/26430541682-1-30216.m4s',
        quality: 30216,
        getTime: 1743150959908,
        type: 'dash',
      },
      hasMetadata: true,
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
      hasMetadata: true,
    },
  ]

  const testResumeExpiredTrack = async () => {
    const track = {
      id: 'BV1m34y1M7pG',
      title: '测试过期曲目',
      artist: '测试过期曲目',
      cover:
        'https://i2.hdslb.com/bfs/archive/67101d909983ae1a5de3637c01ab8c1b4ec3e6e5.jpg',
      source: 'bilibili' as const,
      duration: 199,
      createTime: Date.now(),
      biliStreamUrl: {
        url: 'https://cn-sxty-cu-03-07.bilivideo.com/upgcxcode/82/16/26430541682/26430541682-1-30216.m4s',
        quality: 30216,
        getTime: 1743150959908,
        type: 'dash' as const,
      },
      hasMetadata: true,
    }

    await TrackPlayer.stop()
    await usePlayerStore.setState({
      currentTrack: track,
      currentIndex: 0,
      isPlaying: false,
    })
    await TrackPlayer.load(convertToRNTPTrack(track))
    // await usePlayerStore.getState().togglePlay()
  }

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
    <>
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
          <Button
            mode='contained'
            onPress={() => router.push('/playlist/favorite/111')}
            loading={loading}
            className='mb-2'
          >
            跳转到收藏夹
          </Button>
          <Button
            mode='contained'
            onPress={testResumeExpiredTrack}
            loading={loading}
            className='mb-2'
          >
            测试恢复过期曲目(该操作会破坏播放状态，测试后请重启应用)
          </Button>
          <Button
            mode='contained'
            onPress={testCheckUpdate}
            loading={loading}
            className='mb-2'
          >
            查询是否有可热更新的包
          </Button>
          <Button
            mode='contained'
            onPress={testUpdatePackage}
            loading={loading}
            className='mb-2'
          >
            拉取更新并重载
          </Button>
          <Button
            mode='contained'
            loading={loading}
            className='mb-2'
            onPress={showPlayerQueueModal}
          >
            打开模态框
          </Button>
          <Button
            mode='contained'
            loading={loading}
            className='mb-2'
            onPress={() => sheetRef.current?.close()}
          >
            关闭模态框
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
      <PlayerQueueModal sheetRef={sheetRef} />
    </>
  )
}
