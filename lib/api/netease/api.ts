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
	 * 从歌曲列表中，根据关键词和可选的时长，找到最匹配的歌曲。
	 * 采用混合评分策略，结合了“清洗后匹配”和“原始匹配”的优点。
	 * @param songs 网易云搜索返回的歌曲列表
	 * @param keyword 用于匹配的视频标题 (可能含有噪声)
	 * @param durationMs 可选的歌曲时长 (单位: ms)，用于进行高精度筛选
	 * @returns 最匹配的 NeteaseSong 对象，如果找不到则返回 null
	 */
	public findBestMatch(
		songs: NeteaseSong[],
		keyword: string,
		durationMs?: number,
	): NeteaseSong | null {
		// --- 常量定义 ---
		// 权重配置，用于调整不同匹配项的重要性
		const WEIGHTS = {
			// 时长在容忍度内匹配成功，给予一个较高的基础分
			DURATION_MATCH: 60,
			// 在“清洗后”的标题中匹配到歌名，最高置信度
			CLEAN_NAME_MATCH: 50,
			// 在“清洗后”的标题中匹配到歌手名，高置信度
			CLEAN_ARTIST_MATCH: 30,
			// 清洗后的歌名和歌手名同时匹配，给予高额奖励
			COMBO_BONUS: 40,
			// 在“原始”标题中匹配到别名或翻译名，作为补充项，较低置信度
			RAW_ALIAS_MATCH: 15,
		}
		// 时长匹配的容忍度（毫秒）
		const DURATION_TOLERANCE_MS = 3500 // 3.5秒

		// --- 边缘情况处理 ---
		if (!songs || songs.length === 0) {
			return null
		}

		// --- 辅助函数定义 ---
		/**
		 * 清洗和规范化标题字符串。
		 * 移除常见噪声（如括号内容），统一分隔符，转为小写。
		 * @param title 原始标题
		 * @returns 清理后的标题
		 */
		const cleanAndNormalize = (title: string): string => {
			return title
				.toLowerCase()
				.replace(/【.*?】/g, ' ')
				.replace(/\[.*?\]/g, ' ')
				.replace(/\(.*?\)/g, ' ')
				.replace(/（.*?）/g, ' ')
				.replace(/[-–/—|]/g, ' ') // 统一分隔符为空格
				.replace(/\s+/g, ' ') // 合并连续空格
				.trim()
		}

		// --- 预处理输入数据 ---
		const cleanedKeyword = cleanAndNormalize(keyword)
		const rawKeywordLower = keyword.toLowerCase()

		// --- 初始化循环变量 ---
		let bestMatch: NeteaseSong | null = null
		let maxScore = -1

		// --- 主循环：遍历每首歌计算匹配分 ---
		for (const song of songs) {
			let currentScore = 0

			// 1. 时长匹配 (如果提供了时长)
			// 这是一个强过滤器，时长不匹配的歌曲得分会很低或直接跳过。
			if (typeof durationMs === 'number' && durationMs > 0) {
				const durationDiff = Math.abs(durationMs - song.dt)
				if (durationDiff <= DURATION_TOLERANCE_MS) {
					currentScore += WEIGHTS.DURATION_MATCH
				} else {
					// 如果时长差距过大，这首歌基本不可能是目标，直接跳过以提高效率
					continue
				}
			}

			// 2. 标题匹配
			let hasCleanNameMatch = false
			let hasCleanArtistMatch = false

			// 2A. 高置信度匹配：歌名 vs 清洗后的标题
			const songNameLower = song.name.toLowerCase()
			if (cleanedKeyword.includes(songNameLower)) {
				currentScore += WEIGHTS.CLEAN_NAME_MATCH
				hasCleanNameMatch = true
			}

			// 2B. 高置信度匹配：歌手名 vs 清洗后的标题
			const allArtistNames = song.ar
				.flatMap((artist) => [artist.name, ...(artist.alias || [])])
				.filter(Boolean) // 过滤掉 undefined 或空字符串
				.map((a) => a.toLowerCase())

			for (const artistName of allArtistNames) {
				if (cleanedKeyword.includes(artistName)) {
					currentScore += WEIGHTS.CLEAN_ARTIST_MATCH
					hasCleanArtistMatch = true
					break // 找到一个匹配的歌手即可，避免重复加分
				}
			}

			// 2C. 组合奖励：当歌名和歌手都在清洗后的标题中匹配时，给予高额奖励
			if (hasCleanNameMatch && hasCleanArtistMatch) {
				currentScore += WEIGHTS.COMBO_BONUS
			}

			// 2D. 低置信度匹配（补充）：别名/翻译名 vs 原始标题
			// 用于捕获被 cleanAndNormalize 移除的括号内的别名等信息
			const allAliasesAndTns = [...(song.alia || []), ...(song.tns || [])]
				.filter(Boolean)
				.map((a) => a.toLowerCase())

			for (const alias of allAliasesAndTns) {
				if (alias && rawKeywordLower.includes(alias)) {
					currentScore += WEIGHTS.RAW_ALIAS_MATCH
					break // 找到一个匹配即可
				}
			}

			// --- 更新最佳匹配 ---
			if (currentScore > maxScore) {
				maxScore = currentScore
				bestMatch = song
			}
		}

		console.log(maxScore)

		return bestMatch
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
