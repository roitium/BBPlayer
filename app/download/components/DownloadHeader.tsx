import { View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'

interface DownloadHeaderProps {
	taskCount: number
	onStartAll: () => void
	onClearAll: () => void
}

/**
 * 下载页面的操作栏，显示任务总数、全部开始和清除按钮。
 */
export default function DownloadHeader({
	taskCount,
	onStartAll,
	onClearAll,
}: DownloadHeaderProps) {
	const { colors } = useTheme()

	return (
		<View
			style={{
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				paddingHorizontal: 16,
				paddingVertical: 8,
				borderBottomWidth: 1,
				// 使用主题颜色，确保在深色/浅色模式下都好看
				borderBottomColor: colors.outlineVariant,
			}}
		>
			<Text
				variant='bodyMedium'
				style={{ color: colors.onSurfaceVariant }}
			>
				总共 {taskCount} 个任务
			</Text>
			<View style={{ flexDirection: 'row', gap: 8 }}>
				<Button
					mode='outlined'
					onPress={onClearAll}
					disabled={taskCount === 0}
				>
					全部清除
				</Button>
				<Button
					mode='contained-tonal'
					onPress={onStartAll}
					disabled={taskCount === 0}
				>
					全部开始
				</Button>
			</View>
		</View>
	)
}
