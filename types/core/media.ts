export interface Artist {
	id: number
	name: string
	avatarUrl: string | null
	signature: string | null
	source: 'bilibili' | 'local'
	remoteId: string | null
	createdAt: number
}

interface BaseTrack {
	id: number
	title: string
	artist: Artist | null
	coverUrl: string | null
	source: 'bilibili' | 'local'
	playCountSequence: number[]
	createdAt: number
	duration: number
}

interface BilibiliTrack extends BaseTrack {
	source: 'bilibili'
	bilibiliMetadata: {
		bvid: string
		cid: number | null
		isMultiPart: boolean
		createAt: number
		// 运行时产生的数据，在获取流后才会存在
		bilibiliStreamUrl?: {
			url: string
			quality: number
			getTime: number
			type: 'mp4' | 'dash'
		}
	}
}

interface LocalTrack extends BaseTrack {
	source: 'local'
	localMetadata: {
		localPath: string
	}
}

export type Track = BilibiliTrack | LocalTrack

export interface Playlist {
	id: number
	title: string
	author: Artist | null
	description: string | null
	coverUrl: string | null
	itemCount: number
	contents?: Track[]
	type: 'favorite' | 'collection' | 'multi_page' | 'local'
	remoteSyncId: number | null
	lastSyncedAt: number | null
	createdAt: number
}
