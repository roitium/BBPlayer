jest.mock('../log')

import type { ParsedLrc } from '@/types/player/lyrics'
import { mergeLrc, parseLrc } from '../lyrics'

describe('lyrics utils', () => {
	describe('parseLrc', () => {
		it('应该返回为 null 的 lyrics 对象，如果歌词为空或空白字符串', () => {
			expect(parseLrc('')).toEqual({
				tags: {},
				lyrics: null,
				rawOriginalLyrics: '',
			})
			expect(parseLrc('   ')).toEqual({
				tags: {},
				lyrics: null,
				rawOriginalLyrics: '   ',
			})
		})

		it('应该能正确解析包含 tags 的歌词字符串', () => {
			const lrc = `
        [ar: Artist]
        [ti: Title]
        [00:01.00]Line 1
        [00:02.50]Line 2
      `
			const expected = {
				tags: { ar: 'Artist', ti: 'Title' },
				lyrics: [
					{ timestamp: 1, text: 'Line 1' },
					{ timestamp: 2.5, text: 'Line 2' },
				],
				rawOriginalLyrics: lrc,
			}
			const result = parseLrc(lrc)
			expect(result.tags).toEqual(expected.tags)
			expect(result.lyrics).toEqual(expected.lyrics)
			expect(result.rawOriginalLyrics).toBe(lrc)
		})

		it('应该能正确解析包含多个时间戳的单行歌词', () => {
			const lrc = '[00:01.00][00:05.00]Same Line'
			const result = parseLrc(lrc)
			expect(result.lyrics).toEqual([
				{ timestamp: 1, text: 'Same Line' },
				{ timestamp: 5, text: 'Same Line' },
			])
		})

		it('应该按时间戳排序歌词', () => {
			const lrc = `
        [00:05.00]Line 2
        [00:01.00]Line 1
      `
			const result = parseLrc(lrc)
			expect(result.lyrics).toEqual([
				{ timestamp: 1, text: 'Line 1' },
				{ timestamp: 5, text: 'Line 2' },
			])
		})

		it('应该返回为 null 的 lyrics 对象，如果歌词格式错误', () => {
			const lrc = 'Just some random text'
			const result = parseLrc(lrc)
			expect(result.lyrics).toBeNull()
		})
	})

	describe('mergeLrc', () => {
		const originalLrc: ParsedLrc = {
			tags: { ar: 'Artist' },
			lyrics: [
				{ timestamp: 1, text: 'Line 1' },
				{ timestamp: 3, text: 'Line 2' },
			],
			rawOriginalLyrics: '...',
		}

		it('应该合并翻译歌词', () => {
			const translatedLrc: ParsedLrc = {
				tags: { ti: 'Translated Title' },
				lyrics: [{ timestamp: 1, text: 'Translated Line 1' }],
				rawOriginalLyrics: '...',
			}
			const result = mergeLrc(originalLrc, translatedLrc)
			expect(result.lyrics).toEqual([
				{ timestamp: 1, text: 'Line 1', translation: 'Translated Line 1' },
				{ timestamp: 3, text: 'Line 2' },
			])
			expect(result.tags).toEqual({ ar: 'Artist', ti: 'Translated Title' })
		})

		it('应该返回原始歌词，如果翻译歌词为空', () => {
			const translatedLrc: ParsedLrc = {
				tags: {},
				lyrics: null,
				rawOriginalLyrics: '...',
			}
			expect(mergeLrc(originalLrc, translatedLrc)).toEqual(originalLrc)
		})

		it('应该忽略不匹配的时间戳', () => {
			const translatedLrc: ParsedLrc = {
				tags: {},
				lyrics: [{ timestamp: 2, text: 'Non-matching line' }],
				rawOriginalLyrics: '...',
			}
			const result = mergeLrc(originalLrc, translatedLrc)
			expect(result.lyrics).toEqual(originalLrc.lyrics)
		})
	})
})
