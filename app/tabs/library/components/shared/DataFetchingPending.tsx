import { View } from 'react-native'
import { ActivityIndicator, useTheme } from 'react-native-paper'

export function DataFetchingPending() {
	const { colors } = useTheme()
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: colors.background,
			}}
		>
			<ActivityIndicator size='large' />
		</View>
	)
}
