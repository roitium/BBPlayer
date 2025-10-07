import type { ParsedLrc } from '@/types/player/lyrics'
import log, { toastAndLogError } from './log'

const logger = log.extend('Utils.Lyrics')

/**
 * 解析 LRC 格式的歌词字符串
 * @param lrcString 包含 LRC 歌词的字符串
 * @returns 解析后的歌词(如果解析失败，lyrics 字段为 null)
 */
export function parseLrc(lrcString: string): ParsedLrc {
	if (!lrcString?.trim()) {
		logger.warning('歌词字符串为空，跳过解析')
		return {
			tags: {},
			lyrics: null,
			rawOriginalLyrics: lrcString,
		}
	}

	try {
		const lines = lrcString.split('\n')
		const parsedResult: ParsedLrc = {
			tags: {},
			lyrics: [],
			rawOriginalLyrics: lrcString,
		}

		const tagRegex = /^\[([a-zA-Z0-9]+):(.+)\]$/
		const timestampRegex = /\[(\d{2,}):(\d{2,})(?:[.:](\d{2,3}))?\]/g

		for (const line of lines) {
			const trimmedLine = line.trim()
			if (!trimmedLine) continue

			const metadataMatch = tagRegex.exec(trimmedLine)
			if (metadataMatch) {
				const [, key, value] = metadataMatch
				parsedResult.tags[key] = value.trim()
				continue
			}

			const timestampMatches = [...trimmedLine.matchAll(timestampRegex)]
			if (timestampMatches.length > 0) {
				const lastTimestamp = timestampMatches[timestampMatches.length - 1]
				const textContent = trimmedLine
					.substring(lastTimestamp.index + lastTimestamp[0].length)
					.trim()

				// 如果时间戳后面没有内容，就跳过这一行
				if (!textContent) continue

				for (const match of timestampMatches) {
					const minutes = parseInt(match[1], 10)
					const seconds = parseInt(match[2], 10)
					const fractionalPart = match[3] || '0'
					const milliseconds = parseInt(fractionalPart.padEnd(3, '0'), 10)

					const timestamp = minutes * 60 + seconds + milliseconds / 1000

					parsedResult.lyrics!.push({
						timestamp,
						text: textContent,
					})
				}
			} else {
				toastAndLogError(
					`歌词格式错误，无法解析此行: "${line}"`,
					undefined,
					'Utils.Lyrics',
				)
				return {
					...parsedResult,
					lyrics: null,
					rawOriginalLyrics: lrcString,
				}
			}
		}

		parsedResult.lyrics!.sort((a, b) => a.timestamp - b.timestamp)

		if (parsedResult.lyrics!.length === 0) {
			logger.warning('没解析到歌词，设置 lyrics 为 null')
			return {
				tags: parsedResult.tags,
				lyrics: null,
				rawOriginalLyrics: lrcString,
			}
		}

		return parsedResult
	} catch (e) {
		logger.error('解析歌词失败', e)
		return {
			tags: {},
			lyrics: null,
			rawOriginalLyrics: lrcString,
		}
	}
}

/**
 * 将翻译歌词合并到原始歌词中
 * 只有时间戳完全相同的行才会被合并
 * @param originalLrc - 解析后的原始歌词对象
 * @param translatedLrc - 解析后的翻译歌词对象
 * @returns 合并了翻译的新歌词对象
 */
export function mergeLrc(
	originalLrc: ParsedLrc,
	translatedLrc: ParsedLrc,
): ParsedLrc {
	const translationMap = new Map<number, string>()
	if (!translatedLrc.lyrics || !originalLrc.lyrics) return originalLrc
	for (const line of translatedLrc.lyrics) {
		translationMap.set(line.timestamp, line.text)
	}

	if (translationMap.size === 0) {
		return originalLrc
	}

	const mergedLyrics = originalLrc.lyrics.map((line) => {
		if (translationMap.has(line.timestamp)) {
			return {
				...line,
				translation: translationMap.get(line.timestamp)!,
			}
		}
		return line
	})

	const mergedTags = {
		...translatedLrc.tags,
		...originalLrc.tags,
	}

	return {
		tags: mergedTags,
		lyrics: mergedLyrics,
		rawOriginalLyrics: originalLrc.rawOriginalLyrics,
		rawTranslatedLyrics: translatedLrc.rawOriginalLyrics,
	}
}
