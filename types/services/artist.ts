export interface CreateArtistPayload {
	name: string
	source: 'bilibili' | 'local'
	remoteId?: string | null
	avatarUrl?: string | null
	signature?: string | null
}

export interface UpdateArtistPayload {
	name?: string | null
	avatarUrl?: string | null
	signature?: string | null
}
