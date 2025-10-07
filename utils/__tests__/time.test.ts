import { formatDurationToHHMMSS, formatMMSSToSeconds } from '../time'

describe('time utils', () => {
	describe('formatDurationToHHMMSS', () => {
		it('应该格式化秒数为 MM:SS 格式', () => {
			expect(formatDurationToHHMMSS(59)).toBe('00:59')
			expect(formatDurationToHHMMSS(60)).toBe('01:00')
			expect(formatDurationToHHMMSS(119)).toBe('01:59')
		})

		it('应该格式化秒数为 HH:MM:SS 格式', () => {
			expect(formatDurationToHHMMSS(3599)).toBe('59:59')
			expect(formatDurationToHHMMSS(3600)).toBe('01:00:00')
			expect(formatDurationToHHMMSS(3661)).toBe('01:01:01')
		})
	})

	describe('formatMMSSToSeconds', () => {
		it('应该格式化 MM:SS 格式为秒数', () => {
			expect(formatMMSSToSeconds('00:59')).toBe(59)
			expect(formatMMSSToSeconds('01:00')).toBe(60)
			expect(formatMMSSToSeconds('01:59')).toBe(119)
		})
	})
})
