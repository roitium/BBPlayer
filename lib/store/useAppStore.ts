import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createBilibiliApi } from '../api/bilibili/bilibili'

interface AppState {
  bilibiliCookie: string
  bilibiliApi: ReturnType<typeof createBilibiliApi>

  setBilibiliCookie: (cookie: string | null) => Promise<void>
}

const useAppStore = create<AppState>((set, get) => {
  // 创建一个 API 实例，传入获取 cookie 的函数
  const bilibiliApi = createBilibiliApi(() => get().bilibiliCookie)

  return {
    bilibiliCookie: '',
    bilibiliApi,

    setBilibiliCookie: async (cookie: string | null) => {
      if (cookie) {
        set({ bilibiliCookie: cookie })
        await AsyncStorage.setItem('bilibiliCookie', cookie)
      } else {
        set({
          bilibiliCookie: (await AsyncStorage.getItem('bilibiliCookie')) || '',
        })
      }
    },
  }
})

export default useAppStore
