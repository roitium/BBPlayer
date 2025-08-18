import { FacadeError as BaseFacadeError } from '.'

export type FacadeErrorType =
	| 'SyncTaskAlreadyRunning'
	| 'SyncCollectionFailed'
	| 'SyncMultiPageFailed'
	| 'SyncFavoriteFailed'
	| 'fetchRemotePlaylistMetadataFailed'
	| 'PlaylistDuplicateFailed'
	| 'UpdateTrackLocalPlaylistsFailed'
	| 'BatchAddTracksToLocalPlaylistFailed'

export class FacadeError extends BaseFacadeError {
	constructor(
		message: string,
		opts?: { type?: FacadeErrorType; data?: unknown; cause?: unknown },
	) {
		super(message, { type: opts?.type, data: opts?.data, cause: opts?.cause })
	}
}

export function createSyncTaskAlreadyRunningError(cause?: unknown) {
	return new FacadeError('同步任务正在进行中，请稍后再试', {
		type: 'SyncTaskAlreadyRunning',
		cause,
	})
}

export function createFacadeError(
	type: FacadeErrorType,
	message: string,
	options?: { data?: unknown; cause?: unknown },
) {
	return new FacadeError(message, {
		type,
		data: options?.data,
		cause: options?.cause,
	})
}
