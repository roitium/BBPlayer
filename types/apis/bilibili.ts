// 获取音频流入参（dash）
interface BilibiliAudioStreamParams {
  bvid: string
  cid: number
  audioQuality: number
  enableDolby: boolean
  enableHiRes: boolean
}

// 获取音频流（dash）返回值
interface BilibiliAudioStreamResponse {
  dash: {
    audio:
      | {
          id: number
          baseUrl: string
          backupUrl: string[]
        }[]
      | null
    dolby?: {
      type: number
      audio:
        | {
            id: number
            baseUrl: string
            backupUrl: string[]
          }[]
        | null
    } | null
    hiRes?: {
      display: boolean
      audio: {
        id: number
        baseUrl: string
        backupUrl: string[]
      } | null
    } | null
  }
}

// 历史记录获得的视频信息
interface BilibiliHistoryVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  owner: {
    name: string
  }
  duration: number
}

// 通过 details 接口获取的视频完整信息
interface BilibiliVideoDetails {
  aid: number
  bvid: string
  title: string
  pic: string
  pubtime: number
  duration: string
  owner: {
    name: string
  }
}

// 收藏夹
interface BilibiliPlaylist {
  id: number
  title: string
  cover: string
  media_count: number
}

// 搜索结果接口
interface BilibiliSearchVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  author: string
  duration: string
  senddate: number
}

// 热门搜索接口
interface BilibiliHotSearch {
  keyword: string
  show_name: string
}

export type {
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
  BilibiliHistoryVideo,
  BilibiliVideoDetails,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliHotSearch,
}
