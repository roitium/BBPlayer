import log from '@/utils/log'

const nativeIntentLog = log.extend('NATIVE_INTENT')

export function redirectSystemPath({
	path,
	initial,
}: {
	path: string
	initial: boolean
}) {
	try {
		const url = new URL(path)
		if (initial) {
			return path
		}
		if (url.hostname === 'notification.click') {
			return '/player'
		}
		return path
	} catch {
		nativeIntentLog.error('无法解析 nativeIntent 路径', path)
		return '/unexpected-error'
	}
}
