export interface CreateArtistPayload {
	name: string
	source: 'bilibili' | 'local'
	remoteId?: string
	avatarUrl?: string
	signature?: string
}

export interface UpdateArtistPayload {
	name?: string
	avatarUrl?: string
	signature?: string
}
