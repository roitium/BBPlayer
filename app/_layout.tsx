import '../css/global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useMemo } from 'react'
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { useColorScheme } from '@/hooks/useColorScheme'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const { theme } = useMaterial3Theme({ sourceColor: '#4a6546' })
  const paperTheme = useMemo(
    () =>
      colorScheme === 'dark'
        ? { ...MD3DarkTheme, colors: theme.dark }
        : { ...MD3LightTheme, colors: theme.light },
    [colorScheme, theme],
  )

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <Stack>
          <Stack.Screen
            name='(tabs)'
            options={{ headerShown: false }}
          />
          <Stack.Screen name='+not-found' />
        </Stack>
        <StatusBar style='auto' />
      </PaperProvider>
    </SafeAreaProvider>
  )
}
