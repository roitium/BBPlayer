import type { Result } from 'neverthrow'

interface Settings {
	/**
	 * 向 bilibili 发送播放记录
	 */
	sendPlayHistory: boolean
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
	setEnableSendPlayHistory: (value: boolean) => void
	setBilibiliCookie: (cookieString: string) => Result<void, Error>
	updateBilibiliCookie: (updates: Record<string, string>) => Result<void, Error>
	clearBilibiliCookie: () => void

	// Modals
	setQrCodeLoginModalVisible: (visible: boolean) => void
	setWelcomeModalVisible: (visible: boolean) => void
}

export type { AppState, Settings }
