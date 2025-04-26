import { toast as sonnerToast } from 'sonner-native'
import type { ToastProps } from 'sonner-native/src/types'

type ExternalToast = Omit<
  ToastProps,
  'id' | 'type' | 'title' | 'jsx' | 'promise' | 'variant'
> & {
  id?: string | number
}

type CustomToastOptions = ExternalToast & {}

const show = (message: string, options?: CustomToastOptions) => {
  return sonnerToast(message, options)
}

const success = (message: string, options?: CustomToastOptions) => {
  return sonnerToast.success(message, options)
}

const error = (message: string, options?: CustomToastOptions) => {
  return sonnerToast.error(message, options)
}

const warning = (message: string, options?: CustomToastOptions) => {
  return sonnerToast.warning(message, options)
}

const loading = (message: string, options?: CustomToastOptions) => {
  return sonnerToast.loading(message, options)
}

const promise = <T>(
  promise: Promise<T>,
  options: {
    loading: string
    success: (data: T) => string
    error: (error: unknown) => string
  } & CustomToastOptions,
) => {
  return sonnerToast.promise(promise, options)
}

const custom = (jsx: React.ReactElement, options?: CustomToastOptions) => {
  return sonnerToast.custom(jsx, options)
}

const dismiss = (toastId?: number | string) => {
  sonnerToast.dismiss(toastId)
}

const Toast = {
  show,
  success,
  error,
  warning,
  loading,
  promise,
  custom,
  dismiss,
  wiggle: sonnerToast.wiggle,
}

export default Toast
