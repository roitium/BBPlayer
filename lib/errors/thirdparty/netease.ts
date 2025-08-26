import { ThirdPartyError } from '@/lib/errors'

export type NeteaseApiErrorType =
	| 'RequestFailed'
	| 'ResponseFailed'
	| 'SearchResultNoMatch'

interface NeteaseApiErrorDetails {
	message: string
	msgCode?: number
	rawData?: unknown
	type?: NeteaseApiErrorType
	cause?: unknown
}

interface NeteaseErrorData {
	msgCode: number
	rawData: unknown
}

export class NeteaseApiError extends ThirdPartyError {
	readonly data: NeteaseErrorData
	readonly type?: NeteaseApiErrorType
	constructor({
		message,
		msgCode,
		rawData,
		type,
		cause,
	}: NeteaseApiErrorDetails) {
		super(message, {
			vendor: 'Bilibili',
			type,
			data: {
				rawData,
				msgCode,
			},
			cause,
		})
		this.data = {
			rawData,
			msgCode: msgCode ?? 0,
		}
		this.type = type
	}
}
