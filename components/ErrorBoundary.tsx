import { flatErrorMessage } from '@/utils/log'
import { Text, View } from 'react-native'
import { Button } from 'react-native-paper'

export default function GlobalErrorFallback({
	error,
	resetError,
}: {
	error: unknown
	resetError: () => void
}) {
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				padding: 20,
			}}
		>
			<Text style={{ marginBottom: 8, fontWeight: 'bold', fontSize: 20 }}>
				发生未捕获错误
			</Text>
			<Text style={{ marginBottom: 20, textAlign: 'center' }}>
				{error instanceof Error ? flatErrorMessage(error) : String(error)}
			</Text>
			<Button
				mode='contained'
				labelStyle={{ fontWeight: 'bold' }}
				onPress={resetError}
			>
				重试
			</Button>
		</View>
	)
}
