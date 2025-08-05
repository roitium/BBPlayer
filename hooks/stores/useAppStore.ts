import type { AppState } from '@/types/core/appStore'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'
import * as parseCookie from 'cookie'
import { err, ok, type Result } from 'neverthrow'
import { create } from 'zustand'

export const parseCookieString = (
	cookie?: string,
): Result<Record<string, string>[], Error> => {
	if (!cookie?.trim()) {
		return ok([])
	}

	try {
		const cookieObj = parseCookie.parse(cookie)
		const cookieArray: Record<string, string>[] = []

		for (const [key, value] of Object.entries(cookieObj)) {
			if (value === undefined || value === null) {
				return err(new Error(`Cookie "${key}" 的值无效`))
			}
			cookieArray.push({ key, value })
		}

		return ok(cookieArray)
	} catch (error) {
		return err(
			new Error(
				`无效的 cookie 字符串: ${error instanceof Error ? error.message : String(error)}`,
			),
		)
	}
}

const serializeCookieList = (cookieList: Record<string, string>[]): string => {
	return cookieList
		.map((c) => (c.key && c.value ? parseCookie.serialize(c.key, c.value) : ''))
		.filter(Boolean)
		.join('; ')
}

export const useAppStore = create<AppState>()((set, get) => {
	const sendPlayHistory = storage.getBoolean('send_play_history') ?? true
	const initialCookieString = storage.getString('bilibili_cookie')

	log.debug('AppStore Initializing', {
		initialCookieString,
		sendPlayHistory,
	})

	return {
		bilibiliCookieString: initialCookieString,

		settings: {
			sendPlayHistory,
		},

		getBilibiliCookieList: () => {
			const { bilibiliCookieString } = get()
			return parseCookieString(bilibiliCookieString)
		},

		hasBilibiliCookie: () => {
			const { bilibiliCookieString } = get()
			return Boolean(bilibiliCookieString?.trim())
		},

		setEnableSendPlayHistory: (value: boolean) => {
			set((state) => ({
				settings: { ...state.settings, sendPlayHistory: value },
			}))
			storage.set('send_play_history', value)
		},

		setBilibiliCookie: (cookieString: string) => {
			const result = parseCookieString(cookieString)

			if (result.isErr()) {
				return err(result.error)
			}

			set({ bilibiliCookieString: cookieString })
			storage.set('bilibili_cookie', cookieString)

			return ok(undefined)
		},

		setBilibiliCookieFromList: (cookieList: Record<string, string>[]) => {
			const cookieString = serializeCookieList(cookieList)
			return get().setBilibiliCookie(cookieString)
		},

		clearBilibiliCookie: () => {
			set({ bilibiliCookieString: undefined })
			storage.delete('bilibili_cookie')
		},
	}
})

export default useAppStore
