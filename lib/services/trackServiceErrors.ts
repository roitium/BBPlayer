import { CustomError } from '../core/errors'

export class ValidationError extends CustomError {
	constructor(message: string) {
		super(message)
	}
}

export class TrackNotFoundError extends CustomError {
	constructor(trackId: number | string) {
		super(`Track with ID ${trackId} was not found.`)
	}
}

export class ArtistNotFoundError extends CustomError {
	constructor(artistId: number | string) {
		super(`Artist with identifier ${artistId} was not found.`)
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

export type TrackServiceError =
	| ValidationError
	| TrackNotFoundError
	| DatabaseError
	| ArtistNotFoundError
