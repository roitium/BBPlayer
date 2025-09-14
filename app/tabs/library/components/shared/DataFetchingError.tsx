import { View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'

interface DataFetchingErrorProps {
	text?: string
	onRetry?: () => void
}

export function DataFetchingError({
	text = '加载失败',
	onRetry,
}: DataFetchingErrorProps) {
	const { colors } = useTheme()
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				padding: 16,
				backgroundColor: colors.background,
			}}
		>
			<Text
				variant='titleMedium'
				style={{ textAlign: 'center', marginBottom: 16 }}
			>
				{text}
			</Text>
			{onRetry && (
				<Button
					onPress={onRetry}
					mode='contained'
				>
					重试
				</Button>
			)}
		</View>
	)
}
