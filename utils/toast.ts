import type { TextStyle, ViewStyle } from 'react-native'
import { toast as sonnerToast } from 'sonner-native'

type StyleProps = {
	unstyled?: boolean
	style?: ViewStyle
	styles?: {
		toastContainer?: ViewStyle
		toast?: ViewStyle
		toastContent?: ViewStyle
		title?: TextStyle
		description?: TextStyle
		buttons?: ViewStyle
		closeButton?: ViewStyle
		closeButtonIcon?: ViewStyle
	}
}

type PromiseOptions = {
	promise: Promise<unknown>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	success: (result: any) => string
	error: ((error: unknown) => string) | string
	loading: string
}

export type ToastPosition = 'top-center' | 'bottom-center' | 'center'

export type ToastTheme = 'light' | 'dark' | 'system'

export type ToastSwipeDirection = 'left' | 'up'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

export type AutoWiggle = 'never' | 'toast-change' | 'always'

export type ToastAction = {
	label: string
	onClick: () => void
}

export type ToastProps = StyleProps & {
	id: string | number
	title: string
	variant: ToastVariant
	jsx?: React.ReactNode
	description?: string
	invert?: boolean
	important?: boolean
	duration?: number
	position?: ToastPosition
	dismissible?: boolean
	icon?: React.ReactNode
	action?: ToastAction | React.ReactNode
	cancel?: ToastAction | React.ReactNode
	close?: React.ReactNode
	closeButton?: boolean
	richColors?: boolean
	onDismiss?: (id: string | number) => void
	onAutoClose?: (id: string | number) => void
	promiseOptions?: PromiseOptions
	actionButtonStyle?: ViewStyle
	actionButtonTextStyle?: TextStyle
	cancelButtonStyle?: ViewStyle
	cancelButtonTextStyle?: TextStyle
	onPress?: () => void
}

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

const toast = {
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

export default toast
