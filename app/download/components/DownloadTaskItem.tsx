import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import type {
	DownloadTaskMeta,
	DownloadTaskRuntime,
} from '@/types/core/downloadManagerStore'
import { memo, useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { Icon, IconButton, Surface, Text, useTheme } from 'react-native-paper'
import { useSharedValue } from 'react-native-reanimated'
import { useShallow } from 'zustand/shallow'

const DownloadTaskItem = memo(function DownloadTaskItem({
	task,
}: {
	task: DownloadTaskMeta
}) {
	const { colors } = useTheme()
	const trackRuntime: DownloadTaskRuntime | undefined = useDownloadManagerStore(
		(state) => state.downloadsRuntime[task.uniqueKey],
	)
	const { retry, cancel } = useDownloadManagerStore(
		useShallow((state) => ({
			retry: state.retryDownload,
			cancel: state.cancelDownload,
		})),
	)
	const sharedProgress = useSharedValue(0)

	useEffect(() => {
		if (!trackRuntime) return
		sharedProgress.value = trackRuntime.progress
	}, [sharedProgress, trackRuntime])

	const getStatusText = () => {
		if (!trackRuntime) return '未知状态'
		switch (trackRuntime.status) {
			case 'queued':
				return '等待下载...'
			case 'downloading':
				return '正在下载...'
			case 'failed':
				return '下载失败'
			default:
				return '未知状态'
		}
	}

	const icons = useMemo(() => {
		if (!trackRuntime) return null
		let icon = null
		switch (trackRuntime.status) {
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
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<View style={{ marginRight: trackRuntime.status === 'failed' ? 8 : 0 }}>
					{icon}
				</View>
				{trackRuntime.status === 'failed' && (
					<IconButton
						icon='reload'
						onPress={() => retry(task.uniqueKey)}
					/>
				)}
				<IconButton
					icon='close'
					onPress={() => cancel(task.uniqueKey)}
				/>
			</View>
		)
	}, [cancel, colors.error, retry, task.uniqueKey, trackRuntime.status])

	return (
		<Surface
			style={{
				borderRadius: 8,
				backgroundColor: 'transparent',
				marginVertical: 4,
				marginHorizontal: 8,
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
	)
})

export default DownloadTaskItem
