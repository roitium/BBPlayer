import appStore from '@/hooks/stores/appStore'
import { View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'

export default function TabDisable() {
	const { colors } = useTheme()
	return (
		<View
			style={{
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: colors.background,
				gap: 16,
			}}
		>
			<Text
				variant='titleMedium'
				style={{ textAlign: 'center' }}
			>
				登录 bilibili 账号后才能查看合集
			</Text>
			<Button
				mode='contained'
				onPress={() =>
					appStore.setState((store) => ({
						modals: { ...store.modals, qrCodeLoginModalVisible: true },
					}))
				}
			>
				登录
			</Button>
		</View>
	)
}
