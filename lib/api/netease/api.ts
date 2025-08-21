import { DataParsingError, FileSystemError } from '@/lib/errors'
import { NeteaseApiError } from '@/lib/errors/thirdparty/netease'
import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
	NeteaseSong,
} from '@/types/apis/netease'
import * as FileSystem from 'expo-file-system'
import { err, ok, ResultAsync } from 'neverthrow'
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

	/**
	 * 检索最可能匹配的歌曲
	 * @param songs 歌曲列表
	 * @param keyword 搜索关键词
	 * @param durationMs 期望时长 (毫秒)
	 * @returns 最佳匹配的歌曲或null
	 */
	public findBestMatch(
		songs: NeteaseSong[],
		keyword: string,
		durationMs?: number,
	): NeteaseSong | null {
		if (!songs || songs.length === 0) {
			return null
		}

		const SIGMA_MS = 2500
		const DURATION_BOOST_FACTOR = 0.5

		const scoredSongs = songs.map((song) => {
			let keywordScore = 0
			const lowerCaseKeyword = keyword.toLowerCase()

			if (song.name.toLowerCase() === lowerCaseKeyword) {
				keywordScore += 10
			} else if (lowerCaseKeyword.includes(song.name.toLowerCase())) {
				keywordScore += 5
			}

			song.alia.forEach((alias) => {
				if (lowerCaseKeyword.includes(alias.toLowerCase())) {
					keywordScore += 2
				}
			})

			song.ar.forEach((artist) => {
				if (lowerCaseKeyword.includes(artist.name.toLowerCase())) {
					keywordScore += 1
				}
			})

			let finalScore = keywordScore
			if (durationMs && song.dt && keywordScore > 0) {
				const diffMs = Math.abs(durationMs - song.dt)

				const durationWeight = Math.exp(-(diffMs ** 2) / (2 * SIGMA_MS ** 2))

				finalScore *= 1 + durationWeight * DURATION_BOOST_FACTOR
			}

			return { song, score: finalScore }
		})

		// 找到最高分的歌曲
		const bestMatch = scoredSongs.reduce((best, current) => {
			return current.score > best.score ? current : best
		})

		// 如果所有歌曲的最终得分都为0，则返回列表的第一个作为兜底
		return bestMatch.score > 0 ? bestMatch.song : songs[0]
	}

	smartFetchLyrics({
		keyword,
		internalId,
		path,
	}: {
		keyword: string
		internalId: string
		path: string
	}): ResultAsync<
		NeteaseLyricResponse,
		FileSystemError | NeteaseApiError | DataParsingError
	> {
		const filePath = `${path}/${internalId}.json`

		return ResultAsync.fromPromise(
			FileSystem.getInfoAsync(filePath),
			(e) =>
				new FileSystemError(`检查歌词缓存失败`, {
					cause: e,
					data: { filePath },
				}),
		).andThen((fileInfo) => {
			if (fileInfo.exists) {
				// Cache hit
				return ResultAsync.fromPromise(
					FileSystem.readAsStringAsync(filePath),
					(e) =>
						new FileSystemError(`读取歌词缓存失败`, {
							cause: e,
							data: { filePath },
						}),
				).andThen((content) => {
					try {
						return ok(JSON.parse(content) as NeteaseLyricResponse)
					} catch (e) {
						return err(new DataParsingError('解析歌词缓存失败', { cause: e }))
					}
				})
			}

			return this.search({ keywords: keyword }).andThen((searchResult) => {
				const songs = searchResult.result.songs
				const bestMatch = this.findBestMatch(songs, keyword)

				if (!bestMatch) {
					return err(
						new NeteaseApiError({
							message: '未找到相关歌曲',
						}),
					)
				}

				return this.getLyrics(bestMatch.id).andThen((lyricsResponse) => {
					const lyricData = JSON.stringify(lyricsResponse)
					return ResultAsync.fromPromise(
						FileSystem.makeDirectoryAsync(path, { intermediates: true }),
						(e) =>
							new FileSystemError(`创建歌词缓存目录失败`, {
								cause: e,
								data: { path },
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
