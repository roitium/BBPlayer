import { ApiCallingError } from '@/lib/core/errors'

interface NeteaseApiErrorDetails {
	message: string
	msgCode?: number
	rawData?: unknown
}

export class NeteaseApiError extends ApiCallingError {
	public readonly source = 'Netease'
	public msgCode?: number
	public rawData?: unknown

	constructor({ message, msgCode, rawData }: NeteaseApiErrorDetails) {
		super(`[Netease API Error] ${message}`)
		this.msgCode = msgCode
		this.rawData = rawData
	}
}
