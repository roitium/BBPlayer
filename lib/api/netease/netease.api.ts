import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
} from '@/types/apis/netease'
import { NeteaseApiError } from '@/utils/errors'
import { createRequest, RequestOptions } from './netease.request'
import { createOption, Query } from './netease.utils'

interface SearchQuery extends Query {
	keywords: string
	type?: number | string
	limit?: number
	offset?: number
}

export const createNeteaseApi = () => ({
	getLyrics: async (id: number) => {
		const data = {
			id: id,
			lv: -1,
			tv: -1,
			os: 'pc',
		}
		const requestOptions: RequestOptions = createOption({}, 'weapi')
		const result = await createRequest<object, NeteaseLyricResponse>(
			'/api/song/lyric',
			data,
			requestOptions,
		)

		return result
			.map((res) => res.body)
			.mapErr((err) => new NeteaseApiError('获取歌词失败', 500, err))
	},
	search: async (query: SearchQuery) => {
		const type = query.type || 1
		const endpoint =
			type == '2000' ? '/api/search/voice/get' : '/api/cloudsearch/pc'

		const data: {
			s: string
			type: number | string
			limit: number
			offset: number
			keyword?: string
		} = {
			s: query.keywords,
			type: type,
			limit: query.limit || 30,
			offset: query.offset || 0,
		}

		if (type == '2000') {
			data.keyword = query.keywords
			delete (data as Partial<typeof data>).s
		}

		const requestOptions: RequestOptions = createOption(query, 'weapi')
		const result = await createRequest<object, NeteaseSearchResponse>(
			endpoint,
			data,
			requestOptions,
		)

		return result
			.map((res) => res.body)
			.mapErr((err) => new NeteaseApiError('搜索失败', 500, err))
	},
})
