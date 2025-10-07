jest.mock('./log', () => ({
  __esModule: true,
  default: {
    extend: () => ({
      warning: jest.fn(),
      error: jest.fn(),
    }),
  },
  toastAndLogError: jest.fn(),
}));

import { parseLrc, mergeLrc } from './lyrics'
import type { ParsedLrc } from '@/types/player/lyrics'

describe('lyrics utils', () => {
  describe('parseLrc', () => {
    it('should return null lyrics for empty or whitespace string', () => {
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

    it('should parse a valid LRC string with tags', () => {
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
          { timestamp: 2.05, text: 'Line 2' }, // Validates original parsing: 2 + 50/1000
        ],
        rawOriginalLyrics: lrc,
      }
      const result = parseLrc(lrc);
      expect(result.tags).toEqual(expected.tags);
      expect(result.lyrics).toEqual(expected.lyrics);
      expect(result.rawOriginalLyrics).toBe(lrc);
    })

    it('should handle multiple timestamps on a single line', () => {
      const lrc = '[00:01.00][00:05.00]Same Line'
      const result = parseLrc(lrc)
      expect(result.lyrics).toEqual([
        { timestamp: 1, text: 'Same Line' },
        { timestamp: 5, text: 'Same Line' },
      ])
    })

    it('should sort lyrics by timestamp', () => {
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

    it('should return null lyrics for malformed lrc', () => {
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

    it('should merge translation for matching timestamps', () => {
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

    it('should return original lrc if translated lyrics are null', () => {
      const translatedLrc: ParsedLrc = {
        tags: {},
        lyrics: null,
        rawOriginalLyrics: '...',
      }
      expect(mergeLrc(originalLrc, translatedLrc)).toEqual(originalLrc)
    })

    it('should handle non-matching timestamps gracefully', () => {
        const translatedLrc: ParsedLrc = {
            tags: {},
            lyrics: [{ timestamp: 2, text: 'Non-matching line' }],
            rawOriginalLyrics: '...',
        };
        const result = mergeLrc(originalLrc, translatedLrc);
        expect(result.lyrics).toEqual(originalLrc.lyrics);
    });
  })
})