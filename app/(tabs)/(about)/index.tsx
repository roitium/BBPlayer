import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from '@/utils/toast'
import type { RootStackParamList } from '../../../types/navigation'

const CLICK_TIMES = 3
const CLICK_TOAST_ID = 'click-toast-enter-test-page'

export default function AboutPage() {
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const [clickTimes, setClickTimes] = useState(0)

	// FIXME: 暂不清楚是 sonner-native 的问题还是我的问题，但是使用这个函数进行跳转时，上方被 toast 遮挡的区域会一直存在，哪怕 toast 已经消失，导致其他页面最上方的交互按钮无法被点击
	const handlePress = useCallback(() => {
		setClickTimes(clickTimes + 1)
		if (clickTimes >= CLICK_TIMES) {
			navigation.navigate('Test')
			setTimeout(() => {
				Toast.dismiss(CLICK_TOAST_ID)
				setClickTimes(0)
			}, 200)
			return
		}
		Toast.show(`再点击 ${CLICK_TIMES - clickTimes} 次进入测试页面！`, {
			id: CLICK_TOAST_ID,
		})
	}, [clickTimes, navigation])

	return (
		<View
			style={{
				paddingTop: insets.top,
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<View
				style={{
					paddingHorizontal: 16,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='headlineSmall'
					style={{ fontWeight: 'bold' }}
				>
					关于
				</Text>
			</View>
			<Image
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				source={require('@/assets/images/icon.png')}
				style={{
					width: 300,
					height: 300,
					marginHorizontal: 'auto',
				}}
			/>
			<Text
				variant='headlineLarge'
				style={{ textAlign: 'center', marginBottom: 8 }}
				onPress={() => navigation.navigate('Test')}
			>
				BBPlayer
			</Text>
			<Text
				variant='bodyMedium'
				style={{ textAlign: 'center', marginTop: 8 }}
			>
				一个<Text style={{ textDecorationLine: 'line-through' }}>简陋</Text>的
				Bilibili 音乐播放器
			</Text>
			<Text
				variant='bodyMedium'
				style={{ textAlign: 'center', marginTop: 8 }}
			>
				开源地址：
				<Text
					variant='bodyMedium'
					onPress={() =>
						WebBrowser.openBrowserAsync(
							'https://github.com/yanyao2333/BBPlayer',
						)
					}
					style={{ textDecorationLine: 'underline' }}
				>
					https://github.com/roitium/BBPlayer
				</Text>
			</Text>
		</View>
	)
}
