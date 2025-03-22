import '../css/global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { useColorScheme } from '@/hooks/useColorScheme'
import * as Network from 'expo-network'
import * as Clipboard from 'expo-clipboard'
import { DevToolsBubble } from 'react-native-react-query-devtools'
import { type AppStateStatus, Platform, AppState, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { setupPlayer } from '@/lib/services/setupPlayer'
import useAppStore from '@/lib/store/useAppStore'
import Toast from 'react-native-toast-message'
const developement = process.env.NODE_ENV === 'development'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
  duration: 200,
  fade: true,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
  },
})

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false)

  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme()
  const paperTheme = useMemo(
    () =>
      colorScheme === 'dark'
        ? { ...MD3DarkTheme, colors: theme.dark }
        : { ...MD3LightTheme, colors: theme.light },
    [colorScheme, theme],
  )

  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      const eventSubscription = Network.addNetworkStateListener((state) => {
        setOnline(!!state.isConnected)
      })
      return eventSubscription.remove
    })
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange)

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    async function prepare() {
      try {
        if (!global.playerIsReady) {
          await setupPlayer()
          global.playerIsReady = true
        }
        await useAppStore.getState().setBilibiliCookie(null)
        await useAppStore.getState().setBilibiliUserInfo()
      } catch (error) {
        console.error(error)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide()
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  const onCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text)
      return true
    } catch {
      return false
    }
  }

  return (
    <View
      onLayout={onLayoutRootView}
      className='flex-1'
    >
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name='(tabs)'
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name='player/index'
              options={{ headerShown: false }}
            />
            <Stack.Screen name='+not-found' />
          </Stack>
          <StatusBar style='auto' />
        </PaperProvider>
        {developement && <DevToolsBubble onCopy={onCopy} />}
      </QueryClientProvider>
      <Toast />
    </View>
  )
}
