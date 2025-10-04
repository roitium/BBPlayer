import { alert } from '@/components/modals/AlertModal'
import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import { downloadService } from '@/lib/services/downloadService'
import log, { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import * as Updates from 'expo-updates'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const logger = log.extend('TestPage')

export default function TestPage() {
	const clearQueue = usePlayerStore((state) => state.resetStore)
	const [loading, setLoading] = useState(false)
	const { isUpdatePending } = Updates.useUpdates()
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()

	const testCheckUpdate = async () => {
		try {
			const result = await Updates.checkForUpdateAsync()
			toast.success('检查更新结果', {
				description: `isAvailable: ${result.isAvailable}, whyNotAvailable: ${result.reason}, isRollbackToEmbedding: ${result.isRollBackToEmbedded}`,
				duration: Number.POSITIVE_INFINITY,
			})
		} catch (error) {
			console.error('检查更新失败:', error)
			toast.error('检查更新失败', { description: String(error) })
		}
	}

	const testUpdatePackage = async () => {
		try {
			if (isUpdatePending) {
				await Updates.reloadAsync()
				return
			}
			const result = await Updates.checkForUpdateAsync()
			if (!result.isAvailable) {
				toast.error('没有可用的更新', {
					description: '当前已是最新版本',
				})
				return
			}
			const updateResult = await Updates.fetchUpdateAsync()
			if (updateResult.isNew === true) {
				toast.success('有新版本可用', {
					description: '现在更新',
				})
				setTimeout(() => {
					void Updates.reloadAsync()
				}, 1000)
			}
		} catch (error) {
			console.error('更新失败:', error)
			toast.error('更新失败', { description: String(error) })
		}
	}

	// 清空队列
	const handleClearQueue = async () => {
		try {
			setLoading(true)
			await clearQueue()
			toast.success('队列已清空')
		} catch (error) {
			console.error('清空队列失败:', error)
			toast.error('清空队列失败', { description: String(error) })
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteAllDownloadRecords = () => {
		alert(
			'清除下载缓存',
			'是否清除所有下载缓存？包括下载记录、数据库记录以及实际文件',
			[
				{
					text: '取消',
				},
				{
					text: '确定',
					onPress: async () => {
						try {
							setLoading(true)
							useDownloadManagerStore.getState().clearAll()
							logger.info('清除 zustand store 数据成功')
							const result = await downloadService.deleteAll()
							if (result.isErr()) {
								toast.error('清除下载缓存失败', {
									description: result.error.message,
								})
								return
							}
							logger.info('清除数据库下载记录及实际文件成功')
							toast.success('清除下载缓存成功')
						} catch (error) {
							toastAndLogError('清除下载缓存失败', error, 'TestPage')
						} finally {
							setLoading(false)
						}
					},
				},
			],
			{ cancelable: true },
		)
	}

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<ScrollView
				style={{ flex: 1, padding: 16, paddingTop: insets.top + 30 }}
				contentContainerStyle={{ paddingBottom: currentTrack ? 80 : 20 }}
				contentInsetAdjustmentBehavior='automatic'
			>
				<View style={{ marginBottom: 16 }}>
					<Button
						mode='outlined'
						onPress={handleClearQueue}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						清空队列
					</Button>
					<Button
						mode='outlined'
						onPress={testCheckUpdate}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						查询是否有可热更新的包
					</Button>
					<Button
						mode='outlined'
						onPress={testUpdatePackage}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						拉取热更新并重载
					</Button>
					<Button
						mode='outlined'
						onPress={handleDeleteAllDownloadRecords}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						清空下载缓存
					</Button>
				</View>
			</ScrollView>
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
