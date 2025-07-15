import { AppProviders } from '@/components/providers/AppProviders'
import { toastConfig } from '@/components/toast/ToastConfig'
import { useAppSetup } from '@/hooks/utils/useAppSetup'
import { initializeSentry } from '@/lib/config/sentry'
import * as Sentry from '@sentry/react-native'
import * as SplashScreen from 'expo-splash-screen'
import 'react-native-reanimated'
import Toast from 'react-native-toast-message'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
	duration: 200,
	fade: true,
})

initializeSentry()

export default Sentry.wrap(function RootLayout() {
	const { appIsReady, onLayoutRootView, ref } = useAppSetup()

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
