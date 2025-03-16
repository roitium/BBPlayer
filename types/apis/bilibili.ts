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
  pubdate: number
  duration: string
  owner: {
    name: string
  }
}

// 收藏夹
interface BilibiliPlaylist {
  id: number
  title: string
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

// 用户详细信息
interface BilibiliUserInfo {
  mid: number
  name: string
  face: string
}

// 收藏夹内容
interface BilibiliFavoriteListContent {
  id: number
  bvid: string
  upper: {
    name: string
    face: string
  }
  title: string
  cover: string
  duration: number
  pubdate: number
  page: number
  type: number // 2：视频稿件 12：音频 21：视频合集
  attr: number // 失效	0: 正常；9: up自己删除；1: 其他原因删除
}

// 收藏夹内容
interface BilibiliFavoriteListContents {
  info: {
    id: number
    title: string
    cover: string
    media_count: number
    intro: string
    upper: {
      name: string
      face: string
    }
  }
  medias: BilibiliFavoriteListContent[]
  has_more: boolean
  ttl: number
}

export type {
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
  BilibiliHistoryVideo,
  BilibiliVideoDetails,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliHotSearch,
  BilibiliUserInfo,
  BilibiliFavoriteListContent,
  BilibiliFavoriteListContents,
}
