import { ApiCallingError } from '@/lib/core/errors'

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
}

export class BilibiliApiError extends ApiCallingError {
	public readonly source = 'Bilibili'
	public msgCode?: number
	public rawData?: unknown
	public type?: BilibiliApiErrorType

	constructor({ message, msgCode, rawData, type }: BilibiliApiErrorDetails) {
		super(`[Bilibili API Error] ${message}`)
		this.msgCode = msgCode
		this.rawData = rawData
		this.type = type
	}
}
