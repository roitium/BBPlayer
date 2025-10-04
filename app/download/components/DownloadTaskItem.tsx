import type { ProgressEvent } from '@/hooks/stores/useDownloadManagerStore'
import useDownloadManagerStore, {
	eventListner,
} from '@/hooks/stores/useDownloadManagerStore'
import type { DownloadTask } from '@/types/core/downloadManagerStore'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { Icon, IconButton, Surface, Text, useTheme } from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/shallow'

const DownloadTaskItem = memo(function DownloadTaskItem({
	task,
}: {
	task: DownloadTask
}) {
	const { colors } = useTheme()
	const { retry, cancel } = useDownloadManagerStore(
		useShallow((state) => ({
			retry: state.retryDownload,
			cancel: state.cancelDownload,
		})),
	)
	const sharedProgress = useSharedValue(0)
	const progressBackgroundWidth = useSharedValue(0)
	const containerRef = useRef<View>(null)

	useEffect(() => {
		const handler = (e: ProgressEvent['progress:uniqueKey']) => {
			sharedProgress.value = Math.max(Math.min(e.current / e.total, 1), 0)
		}
		eventListner.on(`progress:${task.uniqueKey}`, handler)

		return () => {
			eventListner.off(`progress:${task.uniqueKey}`, handler)
		}
	}, [task.uniqueKey, sharedProgress])

	useLayoutEffect(() => {
		if (!containerRef.current) return
		containerRef.current.measure((_x, _y, width) => {
			progressBackgroundWidth.value = width
		})
	}, [progressBackgroundWidth])

	useEffect(() => {
		// 只清除当前任务的进度，而不清除 progressBackgroundWidth
		sharedProgress.set(0)
	}, [sharedProgress, task.uniqueKey])

	const progressBackgroundAnimatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateX:
						(sharedProgress.value - 1) * progressBackgroundWidth.value,
				},
			],
		}
	})

	const getStatusText = () => {
		switch (task.status) {
			case 'queued':
				return '等待下载...'
			case 'downloading':
				return '正在下载...'
			case 'failed':
				return '下载失败' + (task.error ? `: ${task.error}` : '')
			case 'completed':
				return '下载完成'
			default:
				return '未知状态'
		}
	}

	const icons = useMemo(() => {
		let icon = null
		switch (task.status) {
			case 'queued':
				icon = (
					<Icon
						source='human-queue'
						size={24}
					/>
				)
				break
			case 'downloading':
				icon = (
					<Icon
						source='progress-download'
						size={24}
					/>
				)
				break
			case 'failed':
				icon = (
					<Icon
						source='close-circle-outline'
						size={24}
						color={colors.error}
					/>
				)
				break
			case 'completed':
				icon = (
					<Icon
						source='check-circle-outline'
						size={24}
					/>
				)
				break
			default:
				icon = (
					<Icon
						source='help-circle-outline'
						size={24}
					/>
				)
				break
		}

		return (
			<>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					{task.status === 'failed' && (
						<IconButton
							icon='reload'
							onPress={() => retry(task.uniqueKey)}
						/>
					)}
					<View style={{ marginRight: task.status === 'failed' ? 0 : 0 }}>
						{icon}
					</View>
					<IconButton
						icon='close'
						onPress={() => cancel(task.uniqueKey)}
					/>
				</View>
			</>
		)
	}, [cancel, colors.error, retry, task.status, task.uniqueKey])

	return (
		<>
			<Surface
				ref={containerRef}
				style={{
					borderRadius: 8,
					backgroundColor: 'transparent',
					marginVertical: 4,
					marginHorizontal: 8,
					position: 'relative',
					width: '100%',
				}}
				elevation={0}
			>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						paddingHorizontal: 8,
						paddingVertical: 8,
					}}
				>
					<View
						style={{
							marginLeft: 12,
							flex: 1,
							marginRight: 4,
							justifyContent: 'center',
						}}
					>
						<Text
							variant='bodyMedium'
							numberOfLines={1}
						>
							{task.title}
						</Text>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								marginTop: 2,
							}}
						>
							<Text
								variant='bodySmall'
								style={{ color: colors.onSurfaceVariant }}
							>
								{getStatusText()}
							</Text>
						</View>
					</View>

					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'flex-end',
						}}
					>
						{icons}
					</View>
				</View>
			</Surface>
			<Animated.View
				style={[
					progressBackgroundAnimatedStyle,
					{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: colors.surfaceVariant,
						zIndex: -100,
						width: '100%',
					},
				]}
			></Animated.View>
		</>
	)
})

export default DownloadTaskItem
