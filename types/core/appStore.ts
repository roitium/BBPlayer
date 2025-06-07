interface Settings {
	// 是否向 bilibili 发送播放历史
	sendPlayHistory: boolean
}

interface AppState {
	bilibiliCookieString: string | undefined
	bilibiliCookieList: Record<string, string>[] | []
	bilibiliCookieError: Error | null
	settings: {
		sendPlayHistory: boolean
	}

	setEnableSendPlayHistory: (value: boolean) => void
	setBilibiliCookieString: (cookieString: string) => void
	setBilibiliCookie: (cookieList: Record<string, string>[]) => void
}

export type { AppState, Settings }
