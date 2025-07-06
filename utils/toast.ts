import Toast from 'react-native-toast-message'

const show = (message: string, options?: object) => {
	Toast.show({ type: 'info', ...options, text1: message })
}

const success = (message: string, options?: object) => {
	Toast.show({ type: 'success', ...options, text1: message })
}

const error = (message: string, options?: object) => {
	Toast.show({ type: 'error', ...options, text1: message })
}

const info = (message: string, options?: object) => {
	Toast.show({ type: 'info', ...options, text1: message })
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
