import { toastConfig } from '@/components/toast/ToastConfig'
import appStore from '@/hooks/stores/appStore'
import useAppStore from '@/hooks/stores/useAppStore'
import { initializeSentry, navigationIntegration } from '@/lib/config/sentry'
import drizzleDb, { expoDb } from '@/lib/db/db'
import { initPlayer } from '@/lib/player/playerLogic'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'
import toast from '@/utils/toast'
import { useNavigationContainerRef } from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import * as Network from 'expo-network'
import * as SplashScreen from 'expo-splash-screen'
import { useSQLiteDevTools } from 'expo-sqlite-devtools'
import * as Updates from 'expo-updates'
import { useCallback, useEffect, useState } from 'react'
import {
	AppState,
	type AppStateStatus,
	InteractionManager,
	Platform,
	View,
} from 'react-native'
import { Text } from 'react-native-paper'
import Toast from 'react-native-toast-message'
import migrations from '../drizzle/migrations'
import { AppProviders } from './providers'

// 在获取资源时保持启动画面可见
void SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
	duration: 200,
	fade: true,
})

// 初始化 Sentry
initializeSentry()

const developement = process.env.NODE_ENV === 'development'

function onAppStateChange(status: AppStateStatus) {
	if (Platform.OS !== 'web') {
		focusManager.setFocused(status === 'active')
	}
}

export default Sentry.wrap(function RootLayout() {
	const ref = useNavigationContainerRef()
	const [appIsReady, setAppIsReady] = useState(false)
	const { success: migrationsSuccess, error: migrationsError } = useMigrations(
		drizzleDb,
		migrations,
	)

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useSQLiteDevTools(expoDb)

	onlineManager.setEventListener((setOnline) => {
		const eventSubscription = Network.addNetworkStateListener((state) => {
			setOnline(!!state.isConnected)
		})
		return eventSubscription.remove.bind(eventSubscription)
	})

	useEffect(() => {
		if (ref?.current) {
			navigationIntegration.registerNavigationContainer(ref)
		}
	}, [ref])

	useEffect(() => {
		const subscription = AppState.addEventListener('change', onAppStateChange)
		return () => subscription.remove()
	}, [])

	useEffect(() => {
		function prepare() {
			try {
				useAppStore.getState()
			} catch (error) {
				log.error('初始化 Zustand store 失败:', error)
				Sentry.captureException(error, { tags: { scope: 'PrepareFunction' } })
			} finally {
				setAppIsReady(true)
			}
		}
		prepare()
	}, [])

	useEffect(() => {
		if (developement) {
			return
		}
		Updates.checkForUpdateAsync()
			.then((result) => {
				if (result.isAvailable) {
					toast.show('有新的热更新，将在下次启动时应用', {
						id: 'update',
					})
				}
			})
			.catch((error: Error) => {
				console.error('检测更新失败', error)
				toast.error('检测更新失败', {
					description: error.message,
				})
			})
	}, [])

	useEffect(() => {
		if (appIsReady) {
			const initializePlayer = async () => {
				if (!global.playerIsReady) {
					try {
						await initPlayer()
					} catch (error) {
						log.error('播放器初始化失败: ', error)
						Sentry.captureException(error, {
							tags: { scope: 'DeferredPlayerSetup' },
						})
						global.playerIsReady = false
					}
				}
			}

			InteractionManager.runAfterInteractions(initializePlayer)
		}
	}, [appIsReady])

	const onLayoutRootView = useCallback(() => {
		if (appIsReady) {
			if (migrationsError) SplashScreen.hide() // 当有错误时，表明迁移已经结束，需要隐藏 SplashScreen 展示错误信息
			if (migrationsSuccess) SplashScreen.hide()
			// 如果是第一次打开，则显示欢迎对话框
			const firstOpen = storage.getBoolean('first_open') ?? true
			if (firstOpen) {
				appStore.setState((store) => ({
					modals: { ...store.modals, welcomeModalVisible: true },
				}))
			}
		}
	}, [appIsReady, migrationsError, migrationsSuccess])

	if (migrationsError) {
		log.error('数据库迁移失败:', migrationsError)
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text>数据库迁移失败: {migrationsError?.message}</Text>
				<Text>建议截图报错信息，发到项目 issues 反馈</Text>
			</View>
		)
	}

	if (!migrationsSuccess || !appIsReady) {
		return null
	}

	return (
		<>
			<AppProviders
				appIsReady={appIsReady}
				onLayoutRootView={onLayoutRootView}
				navRef={ref}
			/>
			<Toast config={toastConfig} />
		</>
	)
})
