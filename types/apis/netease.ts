interface NeteaseLyricResponse {
	lrc: {
		lyric: string
	}
	tlyric: {
		lyric: string
	}
	code: number
}

interface NeteaseSearchResponse {
	result: {
		songs: NeteaseSong[]
		songCount: number
	}
	code: number
}

interface NeteaseSong {
	id: number
	name: string
	ar: NeteaseArtist[]
	al: NeteaseAlbum
	alia: string[] // 歌曲别名
	dt: number // 歌曲时长，单位：ms
}

interface NeteaseArtist {
	id: number
	name: string
}

interface NeteaseAlbum {
	id: number
	name: string
	picUrl: string
}

export type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
	NeteaseSong,
	NeteaseArtist,
	NeteaseAlbum,
}
