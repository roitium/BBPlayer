import type BottomSheet from '@gorhom/bottom-sheet'
import * as EXPOFS from 'expo-file-system'
import { router } from 'expo-router'
import * as Updates from 'expo-updates'
import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import FileViewer from 'react-native-file-viewer'
import { Button, Card, Text, useTheme } from 'react-native-paper'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import Toast from '@/utils/toast'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TestPage() {
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)
  const queue = usePlayerStore((state) => state.queue)
  const [loading, setLoading] = useState(false)
  const { currentlyRunning, isUpdateAvailable, isUpdatePending } =
    Updates.useUpdates()
  const sheetRef = useRef<BottomSheet>(null)
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const testCheckUpdate = async () => {
    const result = await Updates.checkForUpdateAsync()
    Toast.success('检查更新结果', {
      description: `isAvailable: ${result.isAvailable}, whyNotAvailable: ${result.reason}, isRollbackToEmbedding: ${result.isRollBackToEmbedded}`,
      duration: Number.POSITIVE_INFINITY,
    })
  }

  const testUpdatePackage = async () => {
    if (isUpdatePending) {
      await Updates.reloadAsync()
      return
    }
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) {
      Toast.error('没有可用的更新', {
        description: '当前已是最新版本',
      })
      return
    }
    const updateResult = await Updates.fetchUpdateAsync()
    if (updateResult.isNew === true) {
      Toast.success('有新版本可用', {
        description: '现在更新',
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
        Toast.success('打开文件成功')
      })
      .catch((err) => {
        console.log('open file error', err)
        Toast.error('打开文件失败', {
          description: err,
          duration: Number.POSITIVE_INFINITY,
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
    <View
      className='flex-1'
      style={{
        paddingBottom: 80,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView className='flex-1 p-4 '>
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
            onPress={openLogFile}
          >
            打开运行日志
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
              title={track.hasMetadata ? track.title : track.id}
              subtitle={
                track.hasMetadata ? track.artist : '该视频还未获取元数据'
              }
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}
