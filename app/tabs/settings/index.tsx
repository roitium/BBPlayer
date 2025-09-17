import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useAppStore from '@/hooks/stores/useAppStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { toastAndLogError } from '@/utils/log'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Application from 'expo-application'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Updates from 'expo-updates'
import * as WebBrowser from 'expo-web-browser'
import { memo, useCallback, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Divider, IconButton, Switch, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../../types/navigation'

const CLICK_TIMES = 3
const updateTime = Updates.createdAt
	? `${Updates.createdAt.getFullYear()}-${Updates.createdAt.getMonth() + 1}-${Updates.createdAt.getDate()}`
	: ''

export default function SettingsPage() {
	const insets = useSafeAreaInsets()
	const currentTrack = useCurrentTrack()
	const colors = useTheme().colors

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
			}}
		>
			<View
				style={{
					flex: 1,
					paddingTop: insets.top + 8,
					paddingBottom: currentTrack ? 70 : insets.bottom,
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

const AboutSection = memo(function AboutSection() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const [clickTimes, setClickTimes] = useState(0)

	const handlePress = useCallback(() => {
		const next = clickTimes + 1
		setClickTimes(next)
		if (next >= CLICK_TIMES) {
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
	const setEnableSentryReport = useAppStore(
		(state) => state.setEnableSentryReport,
	)
	const enableSentryReport = useAppStore(
		(state) => state.settings.enableSentryReport,
	)
	const setEnableDebugLog = useAppStore((state) => state.setEnableDebugLog)
	const enableDebugLog = useAppStore((state) => state.settings.enableDebugLog)
	const openModal = useModalStore((state) => state.open)

	const shareLogFile = async () => {
		const d = new Date()
		const dateString = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
		const logFilePath = `${FileSystem.documentDirectory}logs/${dateString}.log`
		const exists = await FileSystem.getInfoAsync(logFilePath)
		if (exists.exists) {
			await Sharing.shareAsync(logFilePath)
		} else {
			toastAndLogError('', new Error('无法分享日志：未找到日志文件'), 'UI.Test')
		}
	}

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
				<Text>向 Sentry 上报错误</Text>
				<Switch
					value={enableSentryReport}
					onValueChange={setEnableSentryReport}
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
				<Text>打开 Debug 日志</Text>
				<Switch
					value={enableDebugLog}
					onValueChange={setEnableDebugLog}
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
				<IconButton
					icon='open-in-new'
					size={20}
					onPress={() => openModal('CookieLogin', undefined)}
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
				<Text>重新扫码登录</Text>
				<IconButton
					icon='open-in-new'
					size={20}
					onPress={() => openModal('QRCodeLogin', undefined)}
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
				<Text>分享今日运行日志</Text>
				<IconButton
					icon='share-variant'
					size={20}
					onPress={shareLogFile}
				/>
			</View>
		</View>
	)
})

SettingsSection.displayName = 'SettingsSection'
