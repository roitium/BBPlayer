import type { ToastShowParams } from 'react-native-toast-message'
import Toast from 'react-native-toast-message'

type Options = Omit<ToastShowParams, 'text1' | 'type'> & {
	description?: string
	id?: string
	duration?: number
}

const show = (message: string, options?: Options) => {
	Toast.show({
		type: 'info',
		...options,
		text1: message,
		text2: options?.description,
		visibilityTime: options?.duration ?? 3000,
		autoHide: options?.duration === Number.POSITIVE_INFINITY ? false : true,
	})
}

const success = (message: string, options?: Options) => {
	Toast.show({
		type: 'success',
		...options,
		text1: message,
		text2: options?.description,
		visibilityTime: options?.duration ?? 3000,
		autoHide: options?.duration === Number.POSITIVE_INFINITY ? false : true,
	})
}

const error = (message: string, options?: Options) => {
	Toast.show({
		type: 'error',
		...options,
		text1: message,
		text2: options?.description,
		visibilityTime: options?.duration ?? 3000,
		autoHide: options?.duration === Number.POSITIVE_INFINITY ? false : true,
	})
}

const info = (message: string, options?: Options) => {
	Toast.show({
		type: 'info',
		...options,
		text1: message,
		text2: options?.description,
		visibilityTime: options?.duration ?? 3000,
		autoHide: options?.duration === Number.POSITIVE_INFINITY ? false : true,
	})
}

const dismiss = (id?: string) => {
	if (id) {
		Toast.hide()
	} else {
		Toast.hide()
	}
}

const toast = {
	show,
	success,
	error,
	info,
	dismiss,
}

export default toast
