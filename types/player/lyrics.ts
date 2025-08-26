export type Tags = Record<string, string>

export interface LyricLine {
	/**
	 * 歌词的起始时间，单位：秒
	 */
	timestamp: number
	/**
	 * 原始歌词内容
	 */
	text: string
	/**
	 * 翻译歌词
	 */
	translation?: string
}

export interface ParsedLrc {
	tags: Tags
	lyrics: LyricLine[] | null
	raw: string // 当无法解析时，会 fallback 到这里
	offset?: number // 单位秒
}

export type LyricSearchResult = {
	source: 'netease'
	duration: number // 秒
	title: string
	artist: string
	remoteId: number
}[]
