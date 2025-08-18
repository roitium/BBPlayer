import { ThirdPartyError } from '@/lib/errors'

export type BilibiliApiErrorType =
	| 'RequestFailed'
	| 'ResponseFailed'
	| 'NoCookie'
	| 'CsrfError'
	| 'AudioStreamError'

interface BilibiliApiErrorDetails {
	message: string
	msgCode?: number
	rawData?: unknown
	type?: BilibiliApiErrorType
	cause?: unknown
}

interface BilibiliErrorData {
	msgCode: number
	rawData: unknown
}

export class BilibiliApiError extends ThirdPartyError {
	declare data: BilibiliErrorData
	declare type?: BilibiliApiErrorType
	constructor({
		message,
		msgCode,
		rawData,
		type,
		cause,
	}: BilibiliApiErrorDetails) {
		super(message, {
			vendor: 'Bilibili',
			type,
			data: {
				rawData,
				msgCode,
			},
			cause,
		})
	}
}
