export interface Track {
  id: number
  title: string
  artist: string
  cover: string
  source: 'ytbmusic' | 'bilibili'
  duration: string
}

export interface Playlist {
  id: number
  title: string
  count: number
  cover: string
  source: 'ytbmusic' | 'bilibili' | 'mixed'
}
