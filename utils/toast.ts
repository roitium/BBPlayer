/**
 * Thanks to https://github.com/calintamas/react-native-toast-message/issues/474#issuecomment-2061715523
 */

import type { StyleProp, TextStyle } from 'react-native'
import Toast, {
  type BaseToastProps,
  type ToastOptions,
  type ToastType,
} from 'react-native-toast-message'

type Severity = 'success' | 'error' | 'info' | 'warning'

interface CustomToastOptions extends ToastOptions, BaseToastProps {
  title: string
  message?: string
  severity?: Severity
  length?: 'short' | 'long'
  text1Style?: StyleProp<TextStyle>
  text2Style?: StyleProp<TextStyle>
}

/**
 *
 * @param length 持续时间
 */
export function showToast({
  title,
  message,
  severity = 'info',
  length = 'short',
  text1Style,
  text2Style,
  ...rest
}: CustomToastOptions) {
  const duration = length === 'long' ? 5000 : 3000

  let toastType: ToastType = severity
  if (!['success', 'error', 'warning', 'info'].includes(toastType)) {
    toastType = 'info'
  }

  const contentHeight = message ? 70 + message.length * 2 : 70

  Toast.show({
    type: toastType,
    text1: title,
    text2: message,
    visibilityTime: duration,
    text1Style: { fontSize: 18 },
    text2Style: { fontSize: 14 },
    topOffset: 15,
    text2NumberOfLines: 5,
    style: {
      height: contentHeight,
      paddingVertical: 10,
      paddingHorizontal: 0,
    },
    ...rest,
  })
}
