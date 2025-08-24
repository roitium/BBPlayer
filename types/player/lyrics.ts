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
	lyrics: LyricLine[]
}
