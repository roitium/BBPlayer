import type { AppState } from '@/types/core/appStore'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'
import * as parseCookie from 'cookie'
import { produce } from 'immer'
import { err, ok, type Result } from 'neverthrow'
import { create } from 'zustand'

export const parseCookieToObject = (
	cookie?: string,
): Result<Record<string, string>, Error> => {
	if (!cookie?.trim()) {
		return ok({})
	}
	try {
		const cookieObj = parseCookie.parse(cookie)
		for (const value of Object.values(cookieObj)) {
			if (value === undefined) {
				return err(new Error(`无效的 cookie 字符串：值为 undefined：${value}`))
			}
		}
		return ok(cookieObj as Record<string, string>)
	} catch (error) {
		return err(
			new Error(
				`无效的 cookie 字符串: ${error instanceof Error ? error.message : String(error)}`,
			),
		)
	}
}

export const serializeCookieObject = (
	cookieObj: Record<string, string>,
): string => {
	return Object.entries(cookieObj)
		.map(([key, value]) => parseCookie.serialize(key, value))
		.join('; ')
}

export const useAppStore = create<AppState>()((set, get) => {
	const sendPlayHistory = storage.getBoolean('send_play_history') ?? true
	const initialCookieString = storage.getString('bilibili_cookie')
	let initialCookie: Record<string, string> | null = null

	if (initialCookieString) {
		const result = parseCookieToObject(initialCookieString)
		if (result.isOk()) {
			initialCookie = result.value
		} else {
			log.error('从 storage 中读取 cookie 失败', result.error)
		}
	}

	log.debug('初始化 AppStore', { hasCookie: !!initialCookie })

	return {
		bilibiliCookie: initialCookie,
		settings: { sendPlayHistory },
		modals: { qrCodeLoginModalVisible: false, welcomeModalVisible: false },

		hasBilibiliCookie: () => {
			const { bilibiliCookie } = get()
			return !!bilibiliCookie && Object.keys(bilibiliCookie).length > 0
		},

		setEnableSendPlayHistory: (value) => {
			set((state) => ({
				settings: { ...state.settings, sendPlayHistory: value },
			}))
			storage.set('send_play_history', value)
		},

		setBilibiliCookie: (cookieString) => {
			const result = parseCookieToObject(cookieString)
			if (result.isErr()) {
				return err(result.error)
			}

			const cookieObj = result.value
			set({ bilibiliCookie: cookieObj })
			storage.set('bilibili_cookie', cookieString)
			return ok(undefined)
		},

		updateBilibiliCookie: (updates) => {
			const currentCookie = get().bilibiliCookie ?? {}
			const newCookie = { ...currentCookie, ...updates }

			set({ bilibiliCookie: newCookie })
			storage.set('bilibili_cookie', serializeCookieObject(newCookie))
			return ok(undefined)
		},

		clearBilibiliCookie: () => {
			set({ bilibiliCookie: null })
			storage.delete('bilibili_cookie')
		},

		setQrCodeLoginModalVisible: (visible) => {
			set(
				produce((state: AppState) => {
					state.modals.qrCodeLoginModalVisible = visible
				}),
			)
		},

		setWelcomeModalVisible: (visible) => {
			set(
				produce((state: AppState) => {
					state.modals.welcomeModalVisible = visible
				}),
			)
		},
	}
})

export default useAppStore
