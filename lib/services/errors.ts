import { CustomError } from '../core/errors'

export class ServiceError extends CustomError {
	constructor(message: string) {
		super(message)
	}
}

export class ValidationError extends CustomError {
	constructor(message: string) {
		super(message)
	}
}

export class TrackNotFoundError extends ServiceError {
	constructor(trackId: number | string) {
		super(`未找到 track ${trackId}`)
	}
}

export class ArtistNotFoundError extends ServiceError {
	constructor(artistId: number | string) {
		super(`未找到 artist ${artistId}`)
	}
}

export class PlaylistNotFoundError extends ServiceError {
	constructor(playlistId: number | string) {
		super(`未找到 playlist ${playlistId}`)
	}
}

export class PlaylistAlreadyExistsError extends ServiceError {
	constructor(playlistId: number | string) {
		super(`playlist ${playlistId} 已存在`)
	}
}

export class TrackAlreadyExistsError extends ServiceError {
	constructor(trackId: number | string, playlistId: number | string) {
		super(`track ${trackId} 已存在于 playlist ${playlistId}`)
	}
}

export class TrackNotInPlaylistError extends ServiceError {
	constructor(trackId: number | string, playlistId: number | string) {
		super(`track ${trackId} 不在 playlist ${playlistId} 中`)
	}
}

export class DatabaseError extends CustomError {
	public readonly originalError?: unknown
	constructor(message: string, originalError?: unknown) {
		super(message)
		this.name = 'DatabaseError'
		this.originalError = originalError
	}
}
