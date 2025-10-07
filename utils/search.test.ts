import { matchSearchStrategies, navigateWithSearchStrategy } from './search'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { av2bv } from '@/lib/api/bilibili/utils'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import { err, ok } from 'neverthrow'

// Mock dependencies
jest.mock('@/lib/api/bilibili/api', () => ({
  bilibiliApi: {
    getB23ResolvedUrl: jest.fn(),
  },
}))

jest.mock('@/lib/api/bilibili/utils', () => ({
  av2bv: jest.fn((avid) => `bvfromav${avid}`),
}))

jest.mock('@/utils/log') // Manual mock will be used

jest.mock('@/utils/toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}))

const mockBilibiliApi = bilibiliApi as jest.Mocked<typeof bilibiliApi>
const mockToast = toast as jest.Mocked<typeof toast>
const mockToastAndLogError = toastAndLogError as jest.Mock

describe('search', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('matchSearchStrategies', () => {
    it('should identify a BVID', async () => {
      const result = await matchSearchStrategies('BV1fb41167p7')
      expect(result).toEqual({ type: 'BVID', bvid: 'BV1fb41167p7' })
    })

    it('should identify an AVID and convert it to BVID', async () => {
      const result = await matchSearchStrategies('av170001')
      expect(result).toEqual({ type: 'BVID', bvid: 'bvfromav170001' })
    })

    it('should handle invalid AVID', async () => {
      const result = await matchSearchStrategies('av0')
      expect(result).toEqual({ type: 'AV_PARSE_ERROR', query: 'https://av0/' })
    })

    it('should identify a favorite URL', async () => {
      const result = await matchSearchStrategies(
        'https://www.bilibili.com/medialist/detail/ml123?type=11&fid=123&ctype=11',
      )
      expect(result).toEqual({ type: 'FAVORITE', id: '123' })
    })

    it('should identify a favorite URL with only fid', async () => {
      const result = await matchSearchStrategies(
        'https://www.bilibili.com/medialist/detail/ml123?fid=123',
      )
      expect(result).toEqual({ type: 'FAVORITE', id: '123' })
    })

    it('should identify a collection URL', async () => {
      const result = await matchSearchStrategies(
        'https://www.bilibili.com/medialist/detail/ml456?type=21&fid=456&ctype=21',
      )
      expect(result).toEqual({ type: 'COLLECTION', id: '456' })
    })

    it('should identify a space URL as uploader', async () => {
      const result = await matchSearchStrategies(
        'https://space.bilibili.com/12345',
      )
      expect(result).toEqual({ type: 'UPLOADER', mid: '12345' })
    })

    it('should identify a collection from a space URL', async () => {
      const result = await matchSearchStrategies(
        'https://space.bilibili.com/12345/lists/col67890',
      )
      expect(result).toEqual({ type: 'COLLECTION', id: 'col67890' })
    })

    it('should handle b23.tv short URL resolving to a video', async () => {
      mockBilibiliApi.getB23ResolvedUrl.mockResolvedValue(
        ok('https://www.bilibili.com/video/BV1fb41167p7'),
      )
      const result = await matchSearchStrategies('b23.tv/short')
      expect(result).toEqual({ type: 'BVID', bvid: 'BV1fb41167p7' })
    })

    it('should handle b23.tv short URL resolving to an uploader page', async () => {
      mockBilibiliApi.getB23ResolvedUrl.mockResolvedValue(
        ok('https://space.bilibili.com/12345'),
      )
      const result = await matchSearchStrategies('b23.tv/space')
      expect(result).toEqual({ type: 'UPLOADER', mid: '12345' })
    })

    it('should handle b23.tv resolution error', async () => {
      const error = new Error('Network error')
      mockBilibiliApi.getB23ResolvedUrl.mockResolvedValue(err(error))
      const result = await matchSearchStrategies('b23.tv/error')
      expect(result).toEqual({
        type: 'B23_RESOLVE_ERROR',
        query: 'b23.tv/error',
        error,
      })
    })

    it('should handle b23.tv resolving to an unknown URL', async () => {
      mockBilibiliApi.getB23ResolvedUrl.mockResolvedValue(
        ok('https://example.com'),
      )
      const result = await matchSearchStrategies('b23.tv/unknown')
      expect(result).toEqual({
        type: 'B23_NO_BVID_ERROR',
        query: 'b23.tv/unknown',
        resolvedUrl: 'https://example.com',
      })
    })

    it('should fall back to search for a generic query', async () => {
      const result = await matchSearchStrategies('hello world')
      expect(result).toEqual({ type: 'SEARCH', query: 'hello world' })
    })
  })

  describe('navigateWithSearchStrategy', () => {
    it('should navigate to PlaylistMultipage for BVID', () => {
      const strategy = { type: 'BVID' as const, bvid: 'BV123' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PlaylistMultipage', {
        bvid: 'BV123',
      })
      expect(result).toBe(0)
    })

    it('should navigate to PlaylistFavorite for FAVORITE', () => {
      const strategy = { type: 'FAVORITE' as const, id: 'fav1' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PlaylistFavorite', {
        id: 'fav1',
      })
      expect(result).toBe(0)
    })

    it('should navigate to PlaylistCollection for COLLECTION', () => {
      const strategy = { type: 'COLLECTION' as const, id: 'col1' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PlaylistCollection', {
        id: 'col1',
      })
      expect(result).toBe(0)
    })

    it('should navigate to PlaylistUploader for UPLOADER', () => {
      const strategy = { type: 'UPLOADER' as const, mid: 'mid1' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PlaylistUploader', {
        mid: 'mid1',
      })
      expect(result).toBe(0)
    })

    it('should navigate to SearchResult for SEARCH', () => {
      const strategy = { type: 'SEARCH' as const, query: 'test' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SearchResult', {
        query: 'test',
      })
      expect(result).toBe(1)
    })

    it('should show toast for INVALID_URL_NO_CTYPE', () => {
      const strategy = { type: 'INVALID_URL_NO_CTYPE' as const }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockToast.error).toHaveBeenCalled()
      expect(result).toBe(0)
    })

    it('should handle B23_RESOLVE_ERROR', () => {
      const error = new Error('test error')
      const strategy = {
        type: 'B23_RESOLVE_ERROR' as const,
        query: 'q',
        error,
      }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockToastAndLogError).toHaveBeenCalledWith(
        '解析 b23.tv 短链接失败',
        error,
        'Utils.Search',
      )
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SearchResult', {
        query: 'q',
      })
      expect(result).toBe(1)
    })

    it('should handle B23_NO_BVID_ERROR', () => {
      const strategy = {
        type: 'B23_NO_BVID_ERROR' as const,
        query: 'q',
        resolvedUrl: 'url',
      }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockToastAndLogError).toHaveBeenCalledWith(
        '未能从短链解析出已识别内容（BV/作者/收藏等）',
        expect.any(Error),
        'Utils.Search',
      )
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SearchResult', {
        query: 'q',
      })
      expect(result).toBe(1)
    })

    it('should handle AV_PARSE_ERROR', () => {
      const strategy = { type: 'AV_PARSE_ERROR' as const, query: 'q' }
      const result = navigateWithSearchStrategy(strategy, mockNavigation)
      expect(mockToastAndLogError).toHaveBeenCalledWith(
        '解析 avid 失败',
        expect.any(Error),
        'Utils.Search',
      )
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SearchResult', {
        query: 'q',
      })
      expect(result).toBe(1)
    })
  })
})