import * as FileSystem from 'expo-file-system'
import { err, ok, ResultAsync } from 'neverthrow'

import { DataParsingError, FileSystemError } from '@/lib/core/errors'
import type {
	NeteaseLyricResponse,
	NeteaseSearchResponse,
	NeteaseSong,
} from '@/types/apis/netease'

import { NeteaseApiError } from './netease.errors'
import { createRequest, RequestOptions } from './netease.request'
import { createOption } from './netease.utils'

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
		const type = params.type || 1
		const endpoint =
			type == '2000' ? '/api/search/voice/get' : '/api/cloudsearch/pc'

		const data = {
			type: type,
			limit: params.limit || 30,
			offset: params.offset || 0,
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

	// TODO: 添加考虑歌曲时长维度的相关性计算
	private findBestMatch(
		songs: NeteaseSong[],
		keyword: string,
	): NeteaseSong | null {
		if (!songs || songs.length === 0) {
			return null
		}

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
			return { song, score }
		})

		const bestMatch = scoredSongs.reduce((best, current) => {
			return current.score > best.score ? current : best
		})

		// 如果都没分数，就返回第一个
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
		NeteaseApiError | FileSystemError | DataParsingError
	> {
		const filePath = `${path}/${internalId}.json`

		return ResultAsync.fromPromise(
			FileSystem.getInfoAsync(filePath),
			(e) => new FileSystemError(`检查歌词缓存失败: ${e}`),
		).andThen((fileInfo) => {
			if (fileInfo.exists) {
				// Cache hit
				return ResultAsync.fromPromise(
					FileSystem.readAsStringAsync(filePath),
					(e) => new FileSystemError(`读取歌词缓存失败: ${e}`),
				).andThen((content) => {
					try {
						return ok(JSON.parse(content) as NeteaseLyricResponse)
					} catch {
						return err(new DataParsingError('解析歌词缓存失败'))
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
						(e) => new FileSystemError(`创建歌词缓存目录失败: ${e}`),
					)
						.andThen(() => {
							return ResultAsync.fromPromise(
								FileSystem.writeAsStringAsync(filePath, lyricData, {
									encoding: FileSystem.EncodingType.UTF8,
								}),
								(e) => new FileSystemError(`写入歌词缓存失败: ${e}`),
							)
						})
						.map(() => lyricsResponse)
				})
			})
		})
	}
}

export const neteaseApi = new NeteaseApi()
