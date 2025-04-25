import { View, ScrollView } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import * as Updates from 'expo-updates'
import { showToast } from '@/utils/toast'
import type BottomSheet from '@gorhom/bottom-sheet'
import * as EXPOFS from 'expo-file-system'
import FileViewer from 'react-native-file-viewer'

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

  const openLogFile = async () => {
    let date = new Date()
    const offset = date.getTimezoneOffset()
    date = new Date(date.getTime() - offset * 60 * 1000)
    const logFilePath = `${EXPOFS.documentDirectory}logs_${date.toISOString().split('T')[0]}.log`
    FileViewer.open(logFilePath)
      .then(() => {
        console.log('open file')
        showToast({
          severity: 'info',
          title: '打开文件成功',
        })
      })
      .catch((err) => {
        console.log('open file error', err)
        showToast({
          severity: 'error',
          title: '打开文件失败',
          message: err,
        })
      })
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
      <ScrollView
        className='flex-1 p-4 '
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className='mb-4'>
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
          <Button
            mode='contained'
            loading={loading}
            className='mb-2'
            onPress={openLogFile}
          >
            运行日志
          </Button>
          <Button
            mode='contained'
            loading={loading}
            className='mb-2'
            onPress={() => router.push('/playlist/multipage/BV1re4y1a7zy')}
          >
            分 p 页面
          </Button>
        </View>

        <Text
          variant='titleMedium'
          className='mt-4 mb-2'
        >
          当前队列 ({queue.length}):
        </Text>
        {queue.map((track) => (
          <Card
            key={`${track.id}-${track.cid}`}
            className='mb-2'
          >
            <Card.Title
              title={track.title}
              subtitle={track.artist}
            />
          </Card>
        ))}
      </ScrollView>
    </>
  )
}
