import * as parseCookie from 'cookie'
import { err, ok, type Result } from 'neverthrow'
import { create } from 'zustand'
import type { AppState } from '@/types/core/appStore'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'

const parseCookieString = (
  cookie?: string,
): Result<Record<string, string>[], Error> => {
  if (!cookie) {
    return err(new Error('Cookie 字符串不能为空'))
  }
  if (!cookie.trim()) {
    return ok([])
  }
  try {
    const cookieObj = parseCookie.parse(cookie)
    const cookieArray: Record<string, string>[] = []
    for (const [key, value] of Object.entries(cookieObj)) {
      if (value === undefined || value === null) {
        throw new Error(`Cookie "${key}" 的值无效`)
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

export const useAppStore = create<AppState>()((set, get) => {
  const sendPlayHistory = storage.getBoolean('send_play_history') ?? true
  const initialCookieString = storage.getString('bilibili_cookie')

  const initialCookieList = parseCookieString(initialCookieString)
  const initialCookieError = initialCookieList.isErr()
    ? initialCookieList.error
    : null
  const initialCookieListValue = initialCookieList.isOk()
    ? initialCookieList.value
    : []

  log.debug('AppStore Initializing', {
    initialCookieString,
    initialCookieList: initialCookieListValue,
    initialCookieError: initialCookieError,
    sendPlayHistory,
  })

  return {
    bilibiliCookieString: initialCookieString,
    bilibiliCookieList: initialCookieListValue,
    bilibiliCookieError: initialCookieError,
    settings: {
      sendPlayHistory,
    },

    setEnableSendPlayHistory: (value: boolean) => {
      set((state) => ({
        settings: { ...state.settings, sendPlayHistory: value },
      }))
      storage.set('send_play_history', value)
    },

    setBilibiliCookieString: (cookieString: string) => {
      const cookieList = parseCookieString(cookieString)
      const error = cookieList.isErr() ? cookieList.error : null
      set({
        bilibiliCookieString: cookieString,
        bilibiliCookieList: cookieList.isOk() ? cookieList.value : [],
        bilibiliCookieError: error,
      })
      storage.set('bilibili_cookie', cookieString)
    },

    setBilibiliCookie: (cookieList: Record<string, string>[]) => {
      const cookieString = cookieList
        .map((c) =>
          c.key && c.value ? parseCookie.serialize(c.key, c.value) : '',
        )
        .filter(Boolean)
        .join('; ')
      get().setBilibiliCookieString(cookieString)
    },
  }
})

export default useAppStore
