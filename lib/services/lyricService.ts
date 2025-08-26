import { neteaseApi, type NeteaseApi } from '@/lib/api/netease/api'
import type { Track } from '@/types/core/media'
import type { LyricSearchResult, ParsedLrc } from '@/types/player/lyrics'
import log, { toastAndLogError } from '@/utils/log'
import * as FileSystem from 'expo-file-system'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import type { CustomError } from '../errors'
import { DataParsingError, FileSystemError } from '../errors'

const logger = log.extend('Service.Lyric')
type lyricFileType =
	| ParsedLrc
	| (Omit<ParsedLrc, 'rawOriginalLyrics' | 'rawTranslatedLyrics'> & {
			raw: string
	  })

class LyricService {
	constructor(readonly neteaseApi: NeteaseApi) {}

	private cleanKeyword(keyword: string): string {
		const priorityRegex = /《(.+?)》|「(.+?)」/
		const priorityMatch = priorityRegex.exec(keyword)

		if (priorityMatch) {
			logger.debug(
				'匹配到优先提取的标记，直接返回这段字符串作为 keyword：',
				priorityMatch[1],
				priorityMatch[2],
			)
			return priorityMatch[1] || priorityMatch[2]
		}

		const replacedKeyword = keyword.replace(/【.*?】|“.*?”/g, '').trim()
		const result = replacedKeyword.length > 0 ? replacedKeyword : keyword
		logger.debug('最终 keyword 清洗后：', result)

		return result
	}

	public getBestMatchedLyrics(track: Track) {
		const providers = [
			this.neteaseApi.searchBestMatchedLyrics(
				this.cleanKeyword(track.title),
				track.duration * 1000,
			),
		]
		return ResultAsync.combine(providers).andThen((results) => {
			// FIXME: fuck what's this???
			const randomIndex = Math.floor(Math.random() * results.length)
			return okAsync(results[randomIndex])
		})
	}

	/**
	 * 优先从本地缓存中获取歌词，如果没有则从多个数据源并行查找，返回最匹配的歌词并进行缓存。
	 * @param track
	 * @returns
	 */
	public smartFetchLyrics(track: Track): ResultAsync<ParsedLrc, CustomError> {
		const basePath = `${FileSystem.documentDirectory}lyrics/`
		const filePath = `${basePath}${track.uniqueKey.replaceAll('::', '--')}.json`
		return ResultAsync.fromPromise(
			FileSystem.makeDirectoryAsync(basePath, { intermediates: true }),
			(e) =>
				new FileSystemError(`创建歌词缓存目录失败`, {
					cause: e,
					data: { path: basePath },
				}),
		).andThen(() => {
			return ResultAsync.fromPromise(
				FileSystem.getInfoAsync(filePath),
				(e) =>
					new FileSystemError(`检查歌词缓存失败`, {
						cause: e,
						data: { filePath },
					}),
			).andThen((fileInfo) => {
				if (fileInfo.exists) {
					return ResultAsync.fromPromise(
						FileSystem.readAsStringAsync(filePath),
						(e) =>
							new FileSystemError(`读取歌词缓存失败`, {
								cause: e,
								data: { filePath },
							}),
					).andThen((content) => {
						try {
							return okAsync(JSON.parse(content) as ParsedLrc)
						} catch (e) {
							return errAsync(
								new DataParsingError('解析歌词缓存失败', { cause: e }),
							)
						}
					})
				}

				return this.getBestMatchedLyrics(track).andThen((lyrics) => {
					logger.info('自动搜索最佳匹配的歌词完成')
					return ResultAsync.fromPromise(
						FileSystem.writeAsStringAsync(filePath, JSON.stringify(lyrics), {
							encoding: FileSystem.EncodingType.UTF8,
						}),
						(e) => new FileSystemError(`写入歌词缓存失败`, { cause: e }),
					).andThen(() => okAsync(lyrics))
				})
			})
		})
	}

	public saveLyricsToFile(lyrics: ParsedLrc, uniqueKey: string) {
		const basePath = `${FileSystem.documentDirectory}lyrics/`
		const filePath = `${basePath}${uniqueKey.replaceAll('::', '--')}.json`
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
					FileSystem.writeAsStringAsync(filePath, JSON.stringify(lyrics), {
						encoding: FileSystem.EncodingType.UTF8,
					}),
					(e) => new FileSystemError(`写入歌词缓存失败`, { cause: e }),
				)
			})
			.andThen(() => okAsync(lyrics))
	}

	public fetchLyrics(
		item: LyricSearchResult[0],
		uniqueKey: string,
	): ResultAsync<ParsedLrc | string, Error> {
		switch (item.source) {
			case 'netease':
				return this.neteaseApi
					.getLyrics(item.remoteId)
					.andThen((lyrics) => okAsync(this.neteaseApi.parseLyrics(lyrics)))
					.andThen((lyrics) => {
						return this.saveLyricsToFile(lyrics, uniqueKey)
					})
			default:
				return errAsync(new Error('未知歌曲源'))
		}
	}

	/**
	 * 迁移旧版歌词格式
	 */
	public async migrateFromOldFormat() {
		const basePath = `${FileSystem.documentDirectory}lyrics/`
		try {
			const lyricFiles = await FileSystem.readDirectoryAsync(basePath)
			for (const file of lyricFiles) {
				const filePath = `${basePath}${file}`
				const content = await FileSystem.readAsStringAsync(filePath)
				const parsed = JSON.parse(content) as lyricFileType
				const finalLyric: ParsedLrc = {
					tags: parsed.tags,
					offset: parsed.offset,
					lyrics: parsed.lyrics,
					rawOriginalLyrics: '',
				}
				if ('raw' in parsed) {
					const trySplitIt = parsed.raw.split('\n\n')
					if (trySplitIt.length === 2) {
						finalLyric.rawOriginalLyrics = trySplitIt[0]
						finalLyric.rawTranslatedLyrics = trySplitIt[1]
					} else {
						finalLyric.rawOriginalLyrics = parsed.raw
					}
				} else {
					finalLyric.rawOriginalLyrics = parsed.rawOriginalLyrics
					finalLyric.rawTranslatedLyrics = parsed.rawTranslatedLyrics
				}
				await this.saveLyricsToFile(finalLyric, file.replace('.json', ''))
			}
			logger.info('歌词格式迁移完成')
		} catch (e) {
			toastAndLogError('迁移歌词格式失败', e, 'Service.Lyric')
		}
	}
}

const lyricService = new LyricService(neteaseApi)
export default lyricService
