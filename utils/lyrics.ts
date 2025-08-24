import type { ParsedLrc } from '@/types/player/lyrics'
import log from './log'

const logger = log.extend('Utils.Lyrics')

/**
 * 解析 LRC 格式的歌词字符串
 * @param lrcString 包含 LRC 歌词的字符串
 * @returns 失败时为 null
 */
export function parseLrc(lrcString: string): ParsedLrc | null {
	if (!lrcString?.trim()) {
		logger.warning('歌词字符串为空，跳过解析')
		return null
	}

	try {
		const lines = lrcString.split('\n')
		const parsedResult: ParsedLrc = {
			tags: {},
			lyrics: [],
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
					const milliseconds = parseInt(match[3] || '0', 10)

					const timestamp = minutes * 60 + seconds + milliseconds / 1000

					parsedResult.lyrics.push({
						timestamp,
						text: textContent,
					})
				}
			}
		}

		parsedResult.lyrics.sort((a, b) => a.timestamp - b.timestamp)

		return parsedResult
	} catch (e) {
		logger.error('解析歌词失败', e)
		return null
	}
}

/**
 * 将翻译歌词（tlrc）合并到原始歌词（lrc）中
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
	}
}
