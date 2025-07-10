import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
} from '@/types/apis/netease'
import { createRequest, RequestOptions } from './netease.request'
import { createOption } from './netease.utils'

interface SearchParams {
	keywords: string
	type?: number | string
	limit?: number
	offset?: number
}

export const createNeteaseApi = () => ({
	getLyrics: (id: number) => {
		const data = {
			id: id,
			lv: -1,
			tv: -1,
			os: 'pc',
		}
		const requestOptions: RequestOptions = createOption({}, 'weapi')
		return createRequest<object, NeteaseLyricResponse>(
			'/api/song/lyric',
			data,
			requestOptions,
		).map((res) => res.body)
	},
	search: (params: SearchParams) => {
		const type = params.type || 1
		const endpoint =
			type == '2000' ? '/api/search/voice/get' : '/api/cloudsearch/pc'

		const data: {
			s: string
			type: number | string
			limit: number
			offset: number
			keyword?: string
		} = {
			s: params.keywords,
			type: type,
			limit: params.limit || 30,
			offset: params.offset || 0,
		}

		if (type == '2000') {
			data.keyword = params.keywords
			delete (data as Partial<typeof data>).s
		}

		const requestOptions: RequestOptions = createOption({}, 'weapi')
		return createRequest<object, NeteaseSearchResponse>(
			endpoint,
			data,
			requestOptions,
		).map((res) => res.body)
	},
})
