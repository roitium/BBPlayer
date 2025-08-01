export interface CreatePlaylistPayload {
	title: string
	description?: string
	coverUrl?: string
	authorId?: number
	type: 'favorite' | 'collection' | 'multi_page' | 'local'
	remoteSyncId?: number
}

export interface UpdatePlaylistPayload {
	title?: string
	description?: string
	coverUrl?: string
}

export interface ReorderSingleTrackPayload {
	trackId: number
	fromOrder: number // 从 0 开始
	toOrder: number // 从 0 开始
}
