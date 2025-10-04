export interface Artist {
	id: number
	name: string
	avatarUrl?: string | null
	signature?: string | null
	source: 'bilibili' | 'local'
	remoteId?: string | null
	createdAt: Date
	updatedAt: Date
}

export interface PlayRecord {
	startTime: number // 播放开始的时间戳 (ms)
	durationPlayed: number // 实际播放的秒数
	completed: boolean // 是否完整播放
}

export interface TrackDownloadRecord {
	trackId: number
	status: 'downloaded' | 'failed'
	fileSize: number | null
	downloadedAt: number
}

interface BaseTrack {
	id: number
	uniqueKey: string
	title: string
	artist: Artist | null
	coverUrl: string | null
	source: 'bilibili' | 'local'
	createdAt: Date
	duration: number // 歌曲时长，单位：秒
	trackDownloads: TrackDownloadRecord | null
	updatedAt: Date
}

export interface BilibiliTrack extends BaseTrack {
	source: 'bilibili'
	bilibiliMetadata: {
		bvid: string
		cid: number | null
		isMultiPage: boolean
		videoIsValid: boolean
		mainTrackTitle?: string | null // 如果是分 p 视频，保存该分 p 所在的主视频标题
		// 运行时产生的数据，在获取流后才会存在
		bilibiliStreamUrl?: {
			url: string
			quality: number
			getTime: number
			type: 'mp4' | 'dash' | 'local'
		}
	}
}

export interface LocalTrack extends BaseTrack {
	source: 'local'
	localMetadata: {
		localPath: string
	}
}

export type Track = BilibiliTrack | LocalTrack

export interface Playlist {
	id: number
	title: string
	author: Artist | null // 本地播放列表不存在 author
	description: string | null
	coverUrl: string | null
	itemCount: number
	contents?: Track[]
	type: 'favorite' | 'collection' | 'multi_page' | 'local'
	remoteSyncId: number | null
	lastSyncedAt: Date | null
	createdAt: Date
	updatedAt: Date
}
