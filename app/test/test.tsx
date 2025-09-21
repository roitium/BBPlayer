import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system'
import * as LegacyFileSystem from 'expo-file-system/legacy'
import * as Updates from 'expo-updates'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TestPage() {
	const clearQueue = usePlayerStore((state) => state.resetStore)
	const [loading, setLoading] = useState(false)
	const { isUpdatePending } = Updates.useUpdates()
	const navigation = useNavigation()
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
						onPress={() => navigation.navigate('Player')}
						style={{ marginBottom: 8 }}
					>
						打开播放器
					</Button>
					<Button
						mode='contained'
						onPress={testCheckUpdate}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						查询是否有可热更新的包
					</Button>
					<Button
						mode='contained'
						onPress={testUpdatePackage}
						loading={loading}
						style={{ marginBottom: 8 }}
					>
						拉取更新并重载
					</Button>
					<Button
						mode='outlined'
						onPress={() => {
							console.log(FileSystem.Paths.document.uri)
							console.log(LegacyFileSystem.documentDirectory)
						}}
						style={{ marginBottom: 8 }}
					>
						试试
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
