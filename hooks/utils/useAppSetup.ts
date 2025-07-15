import useAppStore from '@/hooks/stores/useAppStore'
import { navigationIntegration } from '@/lib/config/sentry'
import { initPlayer } from '@/lib/player/playerLogic'
import toast from '@/utils/toast'
import { useNavigationContainerRef } from '@react-navigation/native'
import * as Sentry from '@sentry/react-native'
import { focusManager, onlineManager } from '@tanstack/react-query'
import * as Network from 'expo-network'
import * as SplashScreen from 'expo-splash-screen'
import * as Updates from 'expo-updates'
import { useCallback, useEffect, useState } from 'react'
import {
	AppState,
	type AppStateStatus,
	InteractionManager,
	Platform,
} from 'react-native'

const developement = process.env.NODE_ENV === 'development'

function onAppStateChange(status: AppStateStatus) {
	if (Platform.OS !== 'web') {
		focusManager.setFocused(status === 'active')
	}
}

export function useAppSetup() {
	const ref = useNavigationContainerRef()
	const [appIsReady, setAppIsReady] = useState(false)

	useEffect(() => {
		onlineManager.setEventListener((setOnline) => {
			const eventSubscription = Network.addNetworkStateListener((state) => {
				setOnline(!!state.isConnected)
			})
			return eventSubscription.remove
		})
	}, [])

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
		async function prepare() {
			try {
				useAppStore.getState()
			} catch (error) {
				console.error('Initial preparation error:', error)
				Sentry.captureException(error, { tags: { scope: 'PrepareFunction' } })
			} finally {
				setAppIsReady(true)
			}
		}

		prepare().catch((error) => {
			console.error('Initial preparation error:', error)
			Sentry.captureException(error, { tags: { scope: 'PrepareFunction' } })
		})
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
			.catch((error) => {
				console.error('检测更新失败', error)
				toast.error('检测更新失败', {
					description: error.message,
				})
			})
	}, [])

	// 异步初始化播放器 (在 appIsReady 后执行)
	useEffect(() => {
		if (appIsReady) {
			const initializePlayer = async () => {
				if (!global.playerIsReady) {
					try {
						await initPlayer()
						console.log('Deferred player setup complete.')
					} catch (error) {
						console.error('Deferred player setup failed:', error)
						Sentry.captureException(error, {
							tags: { scope: 'DeferredPlayerSetup' },
						})
						global.playerIsReady = false
					}
				}
			}

			InteractionManager.runAfterInteractions(() =>
				Sentry.startSpan({ name: 'initializePlayer' }, initializePlayer),
			)
		}
	}, [appIsReady])

	const onLayoutRootView = useCallback(() => {
		if (appIsReady) {
			SplashScreen.hide()
		}
	}, [appIsReady])

	return { appIsReady, onLayoutRootView, ref }
}
