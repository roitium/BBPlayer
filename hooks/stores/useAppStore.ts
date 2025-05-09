import { create } from 'zustand'
import { createBilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'

interface Settings {
  // 是否向 bilibili 发送播放历史
  sendPlayHistory: boolean
}

interface AppState {
  bilibiliCookie: string
  bilibiliApi: ReturnType<typeof createBilibiliApi>
  settings: Settings

  setBilibiliCookie: (cookie: string) => void
  setSendPlayHistory: (value: boolean) => void
}

const useAppStore = create<AppState>()((set, get) => {
  // 创建一个 API 实例，传入获取 cookie 的函数
  const bilibiliApi = createBilibiliApi(() => get().bilibiliCookie)
  const sendPlayHistory = storage.getBoolean('send_play_history')

  const initialState = {
    bilibiliCookie: storage.getString('bilibili_cookie') || '',
    bilibiliApi,
    settings: {
      sendPlayHistory: sendPlayHistory === undefined ? true : sendPlayHistory,
    },
  }

  log.debug('AppStore', initialState)

  return {
    ...initialState,

    setSendPlayHistory: (value: boolean) => {
      set({ settings: { sendPlayHistory: value } })
      storage.set('send_play_history', value)
    },

    setBilibiliCookie: (cookie: string) => {
      set({ bilibiliCookie: cookie })
      storage.set('bilibili_cookie', cookie)
    },
  }
})

export default useAppStore
