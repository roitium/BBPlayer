import { AppProviders } from '@/components/providers/AppProviders'
import { toastConfig } from '@/components/toast/ToastConfig'
import { useAppSetup } from '@/hooks/utils/useAppSetup'
import { initializeSentry } from '@/lib/config/sentry'
import drizzleDb, { expoDb } from '@/lib/db/db'
import * as Sentry from '@sentry/react-native'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import * as SplashScreen from 'expo-splash-screen'
import { useSQLiteDevTools } from 'expo-sqlite-devtools'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import Toast from 'react-native-toast-message'
import migrations from '../drizzle/migrations'

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
	duration: 200,
	fade: true,
})

initializeSentry()

export default Sentry.wrap(function RootLayout() {
	const { appIsReady, onLayoutRootView, ref } = useAppSetup()
	const { success, error } = useMigrations(drizzleDb, migrations)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useSQLiteDevTools(expoDb)

	if (error) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text>Migrations failed: {error?.message}</Text>
			</View>
		)
	}

	if (!success) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text>Migrations is in progress......</Text>
			</View>
		)
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
