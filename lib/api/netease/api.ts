import { NeteaseApiError } from '@/lib/errors/thirdparty/netease'
import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
	NeteaseSong,
} from '@/types/apis/netease'
import type { LyricSearchResult, ParsedLrc } from '@/types/player/lyrics'
import { mergeLrc, parseLrc } from '@/utils/lyrics'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'
import type { RequestOptions } from './request'
import { createRequest } from './request'
import { createOption } from './utils'

interface SearchParams {
	keywords: string
	type?: number | string
	limit?: number
	offset?: number
}

export class NeteaseApi {
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
	): ResultAsync<LyricSearchResult, NeteaseApiError> {
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
		).map((res) => {
			if (!res.body.result.songs) return []
			return res.body.result.songs.map((song) => ({
				source: 'netease',
				duration: song.dt / 1000,
				title: song.name,
				artist: song.ar[0].name,
				remoteId: song.id,
			}))
		})
	}

	/**
	 * 从多个角度计算出最可能匹配的歌曲（屎）
	 * @param songs
	 * @param keyword 一般来说，就是 track.title
	 * @param targetDurationMs
	 * @returns
	 */
	private findBestMatch(
		songs: NeteaseSong[],
		keyword: string,
		targetDurationMs: number,
	): NeteaseSong {
		const DURATION_WEIGHT = 10
		const SIGMA_MS = 1500

		const scoredSongs = songs.map((song) => {
			let score = 0
			if (song.name === keyword) {
				score += 10
			}
			if (keyword.includes(song.name)) {
				score += 5
			}
			song.alia.forEach((alias) => {
				if (keyword.includes(alias)) {
					score += 2
				}
			})
			song.ar.forEach((artist) => {
				if (keyword.includes(artist.name)) {
					score += 1
				}
			})

			const durationDiff = song.dt - targetDurationMs
			const durationScore =
				DURATION_WEIGHT *
				Math.exp(-(durationDiff * durationDiff) / (2 * SIGMA_MS * SIGMA_MS))

			score += durationScore

			return { song, score }
		})

		const bestMatch = scoredSongs.reduce((best, current) => {
			return current.score > best.score ? current : best
		})

		return bestMatch.score > 0 ? bestMatch.song : songs[0]
	}

	public parseLyrics(lyricsResponse: NeteaseLyricResponse): ParsedLrc {
		const parsedRawLyrics = parseLrc(lyricsResponse.lrc.lyric)
		if (
			!lyricsResponse.tlyric ||
			lyricsResponse.tlyric.lyric.trim().length === 0
		) {
			return parsedRawLyrics
		}
		const parsedTranslatedLyrics = parseLrc(lyricsResponse.tlyric.lyric)
		if (parsedTranslatedLyrics === null) {
			return parsedRawLyrics
		}
		const mergedLyrics = mergeLrc(parsedRawLyrics, parsedTranslatedLyrics)
		return mergedLyrics
	}

	public searchBestMatchedLyrics(
		keyword: string,
		_targetDurationMs: number,
	): ResultAsync<ParsedLrc, NeteaseApiError> {
		return this.search({ keywords: keyword, limit: 10 }).andThen(
			(searchResult) => {
				if (searchResult.length === 0) {
					return errAsync(
						new NeteaseApiError({
							message: '未搜索到相关歌曲\n\n搜索关键词：' + keyword,
							type: 'SearchResultNoMatch',
						}),
					)
				}

				// const bestMatch = this.findBestMatch(songs, keyword, targetDurationMs)
				// 相信网易云... 哥们儿写的规则太屎了
				const bestMatch = searchResult[0]

				return this.getLyrics(bestMatch.remoteId).andThen((lyricsResponse) => {
					const lyricData = this.parseLyrics(lyricsResponse)
					return okAsync(lyricData)
				})
			},
		)
	}
}

export const neteaseApi = new NeteaseApi()
