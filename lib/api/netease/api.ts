import { DataParsingError, FileSystemError } from '@/lib/errors'
import type { NeteaseApiError } from '@/lib/errors/thirdparty/netease'
import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
} from '@/types/apis/netease'
import * as FileSystem from 'expo-file-system'
import { err, ok, okAsync, ResultAsync } from 'neverthrow'
import type { RequestOptions } from './request'
import { createRequest } from './request'
import { createOption } from './utils'

interface SearchParams {
	keywords: string
	type?: number | string
	limit?: number
	offset?: number
}

class NeteaseApi {
	getLyrics(id: number): ResultAsync<NeteaseLyricResponse, NeteaseApiError> {
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
	}

	search(
		params: SearchParams,
	): ResultAsync<NeteaseSearchResponse, NeteaseApiError> {
		const type = params.type ?? 1
		const endpoint =
			type == '2000' ? '/api/search/voice/get' : '/api/cloudsearch/pc'

		const data = {
			type: type,
			limit: params.limit ?? 30,
			offset: params.offset ?? 0,
			...(type == '2000'
				? { keyword: params.keywords }
				: { s: params.keywords }),
		}

		const requestOptions: RequestOptions = createOption({}, 'weapi')
		return createRequest<object, NeteaseSearchResponse>(
			endpoint,
			data,
			requestOptions,
		).map((res) => res.body)
	}

	smartFetchLyrics({
		keyword,
		uniqueKey,
		basePath,
	}: {
		keyword: string
		uniqueKey: string
		basePath: string
	}): ResultAsync<
		NeteaseLyricResponse | null,
		FileSystemError | NeteaseApiError | DataParsingError
	> {
		const filePath = `${basePath}${uniqueKey.replaceAll('::', '--')}.json`

		return ResultAsync.fromPromise(
			FileSystem.getInfoAsync(filePath),
			(e) =>
				new FileSystemError(`检查歌词缓存失败`, {
					cause: e,
					data: { filePath },
				}),
		).andThen((fileInfo) => {
			if (fileInfo.exists) {
				console.log('cache hit')
				return ResultAsync.fromPromise(
					FileSystem.readAsStringAsync(filePath),
					(e) =>
						new FileSystemError(`读取歌词缓存失败`, {
							cause: e,
							data: { filePath },
						}),
				).andThen((content) => {
					console.log(1)
					try {
						return ok(JSON.parse(content) as NeteaseLyricResponse)
					} catch (e) {
						return err(new DataParsingError('解析歌词缓存失败', { cause: e }))
					}
				})
			}

			return this.search({ keywords: keyword }).andThen((searchResult) => {
				if (!searchResult.result.songs) {
					return ok(null)
				}

				const songs = searchResult.result.songs
				// TODO: 实现匹配策略
				const bestMatch = songs[0]

				if (!bestMatch) {
					return okAsync(null)
				}
				console.log(bestMatch)

				return this.getLyrics(bestMatch.id).andThen((lyricsResponse) => {
					const lyricData = JSON.stringify(lyricsResponse)
					return ResultAsync.fromPromise(
						FileSystem.makeDirectoryAsync(basePath, { intermediates: true }),
						(e) =>
							new FileSystemError(`创建歌词缓存目录失败`, {
								cause: e,
								data: { path: basePath },
							}),
					)
						.andThen(() => {
							return ResultAsync.fromPromise(
								FileSystem.writeAsStringAsync(filePath, lyricData, {
									encoding: FileSystem.EncodingType.UTF8,
								}),
								(e) => new FileSystemError(`写入歌词缓存失败`, { cause: e }),
							)
						})
						.map(() => lyricsResponse)
				})
			})
		})
	}
}

export const neteaseApi = new NeteaseApi()
