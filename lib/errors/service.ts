import { ServiceError } from './index'
export type ServiceErrorType =
	| 'TrackNotFound'
	| 'ArtistNotFound'
	| 'PlaylistNotFound'
	| 'PlaylistAlreadyExists'
	| 'TrackAlreadyExists'
	| 'TrackNotInPlaylist'
	| 'ArtistAlreadyExists'
	| 'Validation'
	| 'NotImplemented'
	| 'FetchDownloadUrlFailed'
	| 'DeleteDownloadRecordFailed'

export function createServiceError(
	type: ServiceErrorType,
	message: string,
	options?: { data?: unknown; cause?: unknown },
) {
	return new ServiceError(message, {
		type,
		data: options?.data,
		cause: options?.cause,
	})
}

export function createTrackNotFound(trackId: number | string, cause?: unknown) {
	return createServiceError('TrackNotFound', `未找到 track ${trackId}`, {
		data: { trackId },
		cause,
	})
}

export function createArtistNotFound(
	artistId: number | string,
	cause?: unknown,
) {
	return createServiceError('ArtistNotFound', `未找到 artist ${artistId}`, {
		data: { artistId },
		cause,
	})
}

export function createPlaylistNotFound(
	playlistId: number | string,
	cause?: unknown,
) {
	return createServiceError(
		'PlaylistNotFound',
		`未找到 playlist ${playlistId}`,
		{ data: { playlistId }, cause },
	)
}

export function createTrackNotInPlaylist(
	trackId: number | string,
	playlistId: number | string,
	cause?: unknown,
) {
	return createServiceError(
		'TrackNotInPlaylist',
		`track ${trackId} 不在 playlist ${playlistId} 中`,
		{
			data: { trackId, playlistId },
			cause,
		},
	)
}

export function createValidationError(
	message = '参数校验失败',
	cause?: unknown,
) {
	return createServiceError('Validation', message, { cause })
}

export function createNotImplementedError(message = '未实现', cause?: unknown) {
	return createServiceError('NotImplemented', message, { cause })
}

export { DatabaseError } from './index'
