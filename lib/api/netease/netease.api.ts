import { errAsync, okAsync } from 'neverthrow'
import type { NeteaseLyricResponse } from '@/types/apis/netease'
import { NeteaseApiError } from '@/utils/errors'

export const createNeteaseApi = () => ({
  getLyrics: async (id: number) => {
    const url = `https://music.163.com/api/song/lyric?lv=-1&tv=-1&os=pc&id=${id}`
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      Accept: 'application/json',
    }
    const options = {
      method: 'GET',
      headers,
    }
    const response = await fetch(url, options)
    if (!response.ok) {
      return errAsync(
        new NeteaseApiError('获取歌词失败', response.status, null),
      )
    }
    const data: NeteaseLyricResponse = await response.json()
    if (data.code !== 200) {
      return errAsync(new NeteaseApiError('获取歌词失败', data.code, data))
    }
    return okAsync(data)
  },
})
