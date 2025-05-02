import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from '@/utils/toast'

const CLICK_TIMES = 3
const CLICK_TOAST_ID = 'click-toast-enter-test-page'

export default function AboutPage() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const [clickTimes, setClickTimes] = useState(0)

  const handlePress = useCallback(() => {
    setClickTimes(clickTimes + 1)
    if (clickTimes >= CLICK_TIMES) {
      Toast.dismiss(CLICK_TOAST_ID)
      setClickTimes(0)
      router.push('/test')
      return
    }
    Toast.show(`再点击 ${CLICK_TIMES - clickTimes} 次进入测试页面！`, {
      id: CLICK_TOAST_ID,
    })
  }, [clickTimes])

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
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
        onPress={handlePress}
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
