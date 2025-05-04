import { create } from 'zustand'
import { createBilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { storage } from '@/utils/mmkv'

interface AppState {
  bilibiliCookie: string
  bilibiliApi: ReturnType<typeof createBilibiliApi>

  setBilibiliCookie: (cookie: string | null) => void
}

const useAppStore = create<AppState>()((set, get) => {
  // 创建一个 API 实例，传入获取 cookie 的函数
  const bilibiliApi = createBilibiliApi(() => get().bilibiliCookie)

  return {
    bilibiliCookie: '',
    bilibiliApi,

    setBilibiliCookie: (cookie: string | null) => {
      if (cookie) {
        set({ bilibiliCookie: cookie })
        storage.set('bilibili_cookie', cookie)
      } else {
        set({
          bilibiliCookie: storage.getString('bilibili_cookie') || '',
        })
      }
    },
  }
})

export default useAppStore
