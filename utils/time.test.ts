import {
  formatRelativeTime,
  formatDurationToHHMMSS,
  formatMMSSToSeconds,
} from './time'
import dayjs from 'dayjs'

describe('time utils', () => {
  describe('formatRelativeTime', () => {
    it('should format a date from a few seconds ago', () => {
      const date = new Date(Date.now() - 5000)
      expect(formatRelativeTime(date)).toBe('几秒前')
    })

    it('should format a date from a minute ago', () => {
      const date = dayjs().subtract(1, 'minute').toDate()
      expect(formatRelativeTime(date)).toBe('1 分钟前')
    });

    it('should format a date from an hour ago', () => {
      const date = dayjs().subtract(1, 'hour').toDate()
      expect(formatRelativeTime(date)).toBe('1 小时前')
    });

    it('should format a date from a day ago', () => {
        const date = dayjs().subtract(1, 'day').toDate()
        expect(formatRelativeTime(date)).toBe('1 天前')
    });

    it('should format a date from a month ago', () => {
        const date = dayjs().subtract(1, 'month').toDate()
        expect(formatRelativeTime(date)).toBe('1 个月前')
    });

    it('should format a date from a year ago', () => {
        const date = dayjs().subtract(1, 'year').toDate()
        expect(formatRelativeTime(date)).toBe('1 年前')
    });
  })

  describe('formatDurationToHHMMSS', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDurationToHHMMSS(59)).toBe('00:59')
      expect(formatDurationToHHMMSS(60)).toBe('01:00')
      expect(formatDurationToHHMMSS(119)).toBe('01:59')
    })

    it('should format seconds to HH:MM:SS', () => {
      expect(formatDurationToHHMMSS(3599)).toBe('59:59')
      expect(formatDurationToHHMMSS(3600)).toBe('01:00:00')
      expect(formatDurationToHHMMSS(3661)).toBe('01:01:01')
    })
  })

  describe('formatMMSSToSeconds', () => {
    it('should format MM:SS to seconds', () => {
      expect(formatMMSSToSeconds('00:59')).toBe(59)
      expect(formatMMSSToSeconds('01:00')).toBe(60)
      expect(formatMMSSToSeconds('01:59')).toBe(119)
    })
  })
})