import { alert } from '@/components/modals/AlertModal'
import type { AppState } from '@/types/core/appStore'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'
import * as parseCookie from 'cookie'
import * as Expo from 'expo'
import { err, ok, type Result } from 'neverthrow'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const logger = log.extend('Store.App')

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

export const useAppStore = create<AppState>()(
	immer((set, get) => {
		const sendPlayHistory = storage.getBoolean('send_play_history') ?? true
		const enableSentryReport =
			storage.getBoolean('enable_sentry_report') ?? true
		const enableDebugLog = storage.getBoolean('enable_debug_log') ?? false
		log.setSeverity(enableDebugLog ? 'debug' : 'info')
		const initialCookieString = storage.getString('bilibili_cookie')
		let initialCookie: Record<string, string> | null = null

		if (initialCookieString) {
			const result = parseCookieToObject(initialCookieString)
			if (result.isOk()) {
				initialCookie = result.value
			} else {
				logger.error('从 storage 中读取 cookie 失败', result.error)
			}
		}

		logger.info('初始化 AppStore', {
			hasCookie: !!initialCookie,
			sendPlayHistory,
			enableSentryReport,
			enableDebugLog,
		})

		return {
			bilibiliCookie: initialCookie,
			settings: { sendPlayHistory, enableSentryReport, enableDebugLog },

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

			setEnableSentryReport: (value) => {
				set((state) => ({
					settings: { ...state.settings, enableSentryReport: value },
				}))
				storage.set('enable_sentry_report', value)
				alert(
					'重启？',
					'切换 Sentry 上报后，需要重启应用才能生效。',
					[
						{ text: '取消' },
						{ text: '确定', onPress: () => Expo.reloadAppAsync() },
					],
					{ cancelable: true },
				)
			},

			setEnableDebugLog: (value) => {
				set((state) => ({
					settings: { ...state.settings, enableDebugLog: value },
				}))
				storage.set('enable_debug_log', value)
				log.setSeverity(value ? 'debug' : 'info')
			},
		}
	}),
)

export default useAppStore
