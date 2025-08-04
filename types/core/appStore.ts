import type { Result } from 'neverthrow'

interface Settings {
	/**
	 * 向 bilibili 发送播放记录
	 */
	sendPlayHistory: boolean
}

interface AppState {
	bilibiliCookieString: string | undefined

	// Settings
	settings: Settings

	// Computed getters
	getBilibiliCookieList: () => Result<Record<string, string>[], Error>
	hasBilibiliCookie: () => boolean

	// Actions
	setEnableSendPlayHistory: (value: boolean) => void
	setBilibiliCookie: (cookieString: string) => Result<void, Error>
	setBilibiliCookieFromList: (
		cookieList: Record<string, string>[],
	) => Result<void, Error>
	clearBilibiliCookie: () => void
}

export type { AppState, Settings }
