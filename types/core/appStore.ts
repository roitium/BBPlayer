import type { Result } from 'neverthrow'

interface Settings {
	/**
	 * 向 bilibili 发送播放记录
	 */
	sendPlayHistory: boolean
	/**
	 * 启用 Sentry 错误报告
	 */
	enableSentryReport: boolean
}

interface Modals {
	qrCodeLoginModalVisible: boolean
	welcomeModalVisible: boolean
}

interface AppState {
	bilibiliCookie: Record<string, string> | null
	settings: Settings
	modals: Modals

	// Cookies
	hasBilibiliCookie: () => boolean
	setBilibiliCookie: (cookieString: string) => Result<void, Error>
	updateBilibiliCookie: (updates: Record<string, string>) => Result<void, Error>
	clearBilibiliCookie: () => void

	// Modals
	setQrCodeLoginModalVisible: (visible: boolean) => void
	setWelcomeModalVisible: (visible: boolean) => void

	// Settings
	setEnableSendPlayHistory: (value: boolean) => void
	setEnableSentryReport: (value: boolean) => void
}

export type { AppState, Settings }
