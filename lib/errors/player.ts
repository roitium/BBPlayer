import { UIError } from '.'

// export enum PlayerErrorType {
// 	UnknownSource = 'UnknownSource',
// 	AudioUrlNotFound = 'AudioUrlNotFound',
// }

export type PlayerErrorType = 'UnknownSource' | 'AudioUrlNotFound'

export class PlayerError extends UIError {
	constructor(
		message: string,
		opts?: { type?: PlayerErrorType; data?: unknown; cause?: unknown },
	) {
		super(message, { type: opts?.type, data: opts?.data, cause: opts?.cause })
	}
}

export function createPlayerError(
	type: PlayerErrorType,
	message: string,
	options?: { data?: unknown; cause?: unknown },
) {
	return new PlayerError(message, {
		type,
		data: options?.data,
		cause: options?.cause,
	})
}
