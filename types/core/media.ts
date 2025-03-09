export interface Track {
  id: string // 对 b 站视频来说，是 bvid
  title: string
  artist: string
  cover: string
  source: 'bilibili' | 'local'
  createTime: number // 时间戳
  duration: number // 秒
  biliStreamUrl?: {
    url: string
    quality: number
    getTime: number // 获取流的时间戳，用于判断流是否过期（120 min）
    type: 'mp4' | 'dash'
  }
  localStreamUrl?: string // 本地音乐的本地路径
}

// 播放列表，b 站的多 p 视频、收藏夹、视频合集都会映射到这个类型
// 收藏夹内可能会出现多 p 视频、视频合集，对于一个音乐来说并不合理，我们需要在转换到本地播放列表时直接过滤掉
export interface Playlist {
  id: number
  title: string
  count: number
  cover: string
  contents?: Track[]
  source: 'bilibili' | 'local'
  biliType: 'multi_part' | 'favorite' | 'collection'
}
