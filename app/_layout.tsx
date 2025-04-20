import '../css/global.css'
import { Stack, useNavigationContainerRef } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { useColorScheme } from '@/hooks/useColorScheme'
import * as Network from 'expo-network'
import * as Clipboard from 'expo-clipboard'
import { DevToolsBubble } from 'react-native-react-query-devtools'
import {
  type AppStateStatus,
  Platform,
  AppState,
  View,
  InteractionManager,
} from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import useAppStore from '@/lib/store/useAppStore'
import Toast from 'react-native-toast-message'
import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'
import { BilibiliApiError, CsrfError } from '@/utils/errors'
import GlobalErrorFallback from '@/components/ErrorBoundary'
import { setupPlayer } from '@/lib/services/setupPlayer'
import { showToast } from '@/utils/toast'
import * as Updates from 'expo-updates'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import log from '@/utils/log'

const rootLog = log.extend('ROOT')

const manifest = Updates.manifest
const metadata = 'metadata' in manifest ? manifest.metadata : undefined
const extra = 'extra' in manifest ? manifest.extra : undefined
const updateGroup =
  metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined

const developement = process.env.NODE_ENV === 'development'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
  duration: 200,
  fade: true,
})

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
  dsn: 'https://893ea8eb3743da1e065f56b3aa5e96f9@o4508985265618944.ingest.us.sentry.io/4508985267191808',
  debug: false,
  tracesSampleRate: developement ? 1 : 0.7,
  sendDefaultPii: true,
  integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],
  enableNativeFramesTracking: !isRunningInExpoGo(),
  profilesSampleRate: developement ? 0 : 0.1,
})

const scope = Sentry.getGlobalScope()

scope.setTag('expo-update-id', Updates.updateId)
scope.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch)

if (typeof updateGroup === 'string') {
  scope.setTag('expo-update-group-id', updateGroup)

  const owner = extra?.expoClient?.owner ?? '[account]'
  const slug = extra?.expoClient?.slug ?? '[project]'
  scope.setTag(
    'expo-update-debug-url',
    `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
  )
} else if (Updates.isEmbeddedLaunch) {
  scope.setTag('expo-update-debug-url', 'not applicable for embedded updates')
}

// 设置全局错误处理器，捕获未被处理的 JS 错误
if (!developement) {
  // biome-ignore lint/suspicious/noExplicitAny: 无需解释
  const errorUtils = (global as any).ErrorUtils
  if (errorUtils) {
    const originalErrorHandler = errorUtils.getGlobalHandler()

    errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      Sentry.captureException(error, {
        tags: {
          scope: 'GlobalErrorHandler',
          isFatal: String(isFatal),
        },
      })

      originalErrorHandler(error, isFatal)
    })
  }
}

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
  queryCache: new QueryCache({
    onError: (error, query) => {
      showToast({
        severity: 'error',
        title: `请求 ${query.queryKey} 失败`,
        message: error.message,
      })
      rootLog.error(`请求 ${query.queryKey} 失败`, error)

      // 这两个错误属于三方依赖的错误，不应该报告到 Sentry
      if (error instanceof BilibiliApiError || error instanceof CsrfError) {
        if (!developement) return
      }

      Sentry.captureException(error, {
        tags: {
          scope: 'QueryCache',
          queryKey: JSON.stringify(query.queryKey),
        },
        extra: {
          queryHash: query.queryHash,
          retry: query.options.retry,
        },
      })
    },
  }),

  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      showToast({
        severity: 'error',
        title: `请求 mutation: ${mutation.mutationId} 失败`,
        message: error.message,
      })

      rootLog.error(`请求 mutation: ${mutation.mutationId} 失败`, error)

      if (error instanceof BilibiliApiError || error instanceof CsrfError) {
        if (!developement) return
      }

      Sentry.captureException(error, {
        tags: {
          scope: 'MutationCache',
          mutationId: mutation.mutationId,
        },
      })
    },
  }),
})

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}

export default Sentry.wrap(function RootLayout() {
  const ref = useNavigationContainerRef()
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
        await useAppStore.getState().setBilibiliCookie(null)
      } catch (error) {
        console.error('Initial preparation error:', error)
        Sentry.captureException(error, { tags: { scope: 'PrepareFunction' } })
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  // 异步初始化播放器 (在 appIsReady 后执行)
  useEffect(() => {
    if (appIsReady) {
      const initializePlayer = async () => {
        if (!global.playerIsReady) {
          try {
            await setupPlayer()
            console.log('Deferred player setup complete.')
            global.playerIsReady = true
          } catch (error) {
            console.error('Deferred player setup failed:', error)
            Sentry.captureException(error, {
              tags: { scope: 'DeferredPlayerSetup' },
            })
            global.playerIsReady = false
          }
        }
        // ---
      }

      InteractionManager.runAfterInteractions(() =>
        Sentry.startSpan({ name: 'initializePlayer' }, initializePlayer),
      )
    }
  }, [appIsReady])

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
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <GlobalErrorFallback
            error={error}
            resetError={resetError}
          />
        )}
      >
        <GestureHandlerRootView>
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
            </PaperProvider>
            {developement && <DevToolsBubble onCopy={onCopy} />}
          </QueryClientProvider>
          <Toast />
        </GestureHandlerRootView>
      </Sentry.ErrorBoundary>
      <StatusBar style='auto' />
    </View>
  )
})
