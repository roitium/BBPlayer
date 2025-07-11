import CookieLoginModal from '@/components/modals/CookieLoginModal'
import QrCodeLoginModal from '@/components/modals/QRCodeLoginModal'
import useAppStore from '@/hooks/stores/useAppStore'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Application from 'expo-application'
import * as Updates from 'expo-updates'
import * as WebBrowser from 'expo-web-browser'
import { memo, useCallback, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button, Divider, Switch, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

const CLICK_TIMES = 3
const updateTime = Updates.createdAt
	? `${Updates.createdAt.getFullYear()}-${Updates.createdAt.getMonth() + 1}-${Updates.createdAt.getDate()}`
	: ''

export default function SettingsPage() {
	const insets = useSafeAreaInsets()
	const colors = useTheme().colors
	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
				paddingTop: insets.top + 8,
			}}
		>
			<View
				style={{
					paddingHorizontal: 25,
					paddingBottom: 20,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='headlineSmall'
					style={{ fontWeight: 'bold' }}
				>
					设置
				</Text>
			</View>
			<ScrollView
				style={{
					flex: 1,
				}}
				contentContainerStyle={{
					paddingHorizontal: 25,
				}}
				contentInsetAdjustmentBehavior='automatic'
			>
				<SettingsSection />
			</ScrollView>
			<Divider style={{ marginTop: 16, marginBottom: 16 }} />
			<AboutSection />
		</View>
	)
}

const AboutSection = memo(function AboutSection() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const [clickTimes, setClickTimes] = useState(0)

	const handlePress = useCallback(() => {
		setClickTimes(clickTimes + 1)
		if (clickTimes >= CLICK_TIMES) {
			navigation.navigate('Test')
			setTimeout(() => {
				setClickTimes(0)
			}, 200)
			return
		}
	}, [clickTimes, navigation])

	return (
		<View style={{ paddingBottom: 15 }}>
			<Text
				variant='titleLarge'
				style={{ textAlign: 'center', marginBottom: 5 }}
				onPress={handlePress}
			>
				BBPlayer
			</Text>
			<Text
				variant='bodySmall'
				style={{ textAlign: 'center', marginBottom: 5 }}
			>
				v{Application.nativeApplicationVersion}:{Application.nativeBuildVersion}{' '}
				{Updates.updateId
					? `(hotfix-${Updates.updateId.slice(0, 7)}-${updateTime})`
					: ''}
			</Text>

			<Text
				variant='bodyMedium'
				style={{ textAlign: 'center' }}
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
})

AboutSection.displayName = 'AboutSection'

const SettingsSection = memo(function SettingsSection() {
	const setSendPlayHistory = useAppStore(
		(state) => state.setEnableSendPlayHistory,
	)
	const sendPlayHistory = useAppStore((state) => state.settings.sendPlayHistory)
	const [cookieDialogVisible, setCookieDialogVisible] = useState(false)
	const [isQrCodeLoginDialogVisible, setIsQrCodeLoginDialogVisible] =
		useState(false)

	return (
		<View style={{ flexDirection: 'column' }}>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginTop: 16,
				}}
			>
				<Text>向 bilibili 上报观看进度</Text>
				<Switch
					value={sendPlayHistory}
					onValueChange={setSendPlayHistory}
				/>
			</View>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginTop: 16,
				}}
			>
				<Text>手动设置 Cookie</Text>
				<Button
					mode='contained'
					onPress={() => setCookieDialogVisible(true)}
				>
					打开窗口
				</Button>
			</View>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginTop: 16,
				}}
			>
				<Text>重新扫码登录</Text>
				<Button
					mode='contained'
					onPress={() => setIsQrCodeLoginDialogVisible(true)}
				>
					打开窗口
				</Button>
			</View>

			<CookieLoginModal
				visible={cookieDialogVisible}
				setVisible={setCookieDialogVisible}
			/>
			<QrCodeLoginModal
				visible={isQrCodeLoginDialogVisible}
				setVisible={setIsQrCodeLoginDialogVisible}
			/>
		</View>
	)
})

SettingsSection.displayName = 'SettingsSection'
