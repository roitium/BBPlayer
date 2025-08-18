import { ThirdPartyError } from '@/lib/errors'

export enum BilibiliApiErrorType {
	RequestFailed = 'RequestFailed',
	ResponseFailed = 'ResponseFailed',
	NoCookie = 'NoCookie',
	CsrfError = 'CsrfError',
	AudioStreamError = 'AudioStreamError',
}

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
