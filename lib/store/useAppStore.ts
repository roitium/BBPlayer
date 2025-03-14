import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createBilibiliApi } from '../api/bilibili/bilibili'

interface AppState {
  bilibiliCookie: string
  bilibiliUid: number
  bilibiliAvatar: string
  bilibiliApi: ReturnType<typeof createBilibiliApi>

  setBilibiliCookie: (cookie: string | null) => Promise<void>
  setBilibiliUserInfo: () => Promise<void>
}

const useAppStore = create<AppState>((set, get) => {
  // 创建一个 API 实例，传入获取 cookie 的函数
  const bilibiliApi = createBilibiliApi(() => get().bilibiliCookie)

  return {
    bilibiliCookie: '',
    bilibiliUid: 0,
    bilibiliAvatar: '',
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
    setBilibiliUserInfo: async () => {
      if (get().bilibiliCookie) {
        try {
          const userInfo = await get().bilibiliApi.getUserInfo()
          set({
            bilibiliUid: userInfo.mid,
            bilibiliAvatar: userInfo.face,
          })
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
      }
    },
  }
})

export default useAppStore
