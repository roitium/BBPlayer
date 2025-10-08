import { jest } from '@jest/globals'
import type {
  BilibiliCollectionAllContents,
  BilibiliFavoriteListContents,
  BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import { err, ok } from 'neverthrow'
import { bilibiliApi } from '../../api/bilibili/api'
import { BilibiliFacade } from '../bilibili'

// Mock the API module
jest.mock('../../api/bilibili/api')
jest.mock('@/utils/log')

const mockedBilibiliApi = bilibiliApi as jest.Mocked<typeof bilibiliApi>

describe('BilibiliFacade', () => {
  let facade: BilibiliFacade

  beforeEach(() => {
    jest.clearAllMocks()
    facade = new BilibiliFacade(mockedBilibiliApi)
  })

  describe('fetchRemotePlaylistMetadata', () => {
    it('当类型为 "collection" 时，应成功获取并返回正确的元数据', async () => {
      const mockData: Partial<BilibiliCollectionAllContents> = {
        info: {
          title: '测试合集',
          intro: '这是一个测试合集',
          cover: 'http://example.com/cover.jpg',
        },
      }
      mockedBilibiliApi.getCollectionAllContents.mockReturnValue(
        ok(mockData as BilibiliCollectionAllContents),
      )

      const result = await facade.fetchRemotePlaylistMetadata(123, 'collection')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        title: '测试合集',
        description: '这是一个测试合集',
        coverUrl: 'http://example.com/cover.jpg',
      })

      expect(mockedBilibiliApi.getCollectionAllContents).toHaveBeenCalledWith(123)
    })

    it('当类型为 "multi_page" 时，应成功获取并返回正确的元数据', async () => {
      const mockData: Partial<BilibiliVideoDetails> = {
        title: '测试多P视频',
        desc: '这是一个测试多P视频',
        pic: 'http://example.com/pic.jpg',
      }
      mockedBilibiliApi.getVideoDetails.mockReturnValue(
        ok(mockData as BilibiliVideoDetails),
      )

      const result = await facade.fetchRemotePlaylistMetadata(
        // av170001 -> BV17x411w7KC
        170001,
        'multi_page',
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        title: '测试多P视频',
        description: '这是一个测试多P视频',
        coverUrl: 'http://example.com/pic.jpg',
      })

      expect(mockedBilibiliApi.getVideoDetails).toHaveBeenCalledWith(
        'BV17x411w7KC',
      )
    })

    it('当类型为 "favorite" 时，应成功获取并返回正确的元数据', async () => {
      const mockData: Partial<BilibiliFavoriteListContents> = {
        info: {
          title: '测试收藏夹',
          intro: '这是一个测试收藏夹',
          cover: 'http://example.com/fav_cover.jpg',
        },
      }
      mockedBilibiliApi.getFavoriteListContents.mockReturnValue(
        ok(mockData as BilibiliFavoriteListContents),
      )

      const result = await facade.fetchRemotePlaylistMetadata(456, 'favorite')

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual({
        title: '测试收藏夹',
        description: '这是一个测试收藏夹',
        coverUrl: 'http://example.com/fav_cover.jpg',
      })

      expect(mockedBilibiliApi.getFavoriteListContents).toHaveBeenCalledWith(
        456,
        1,
      )
    })

    it('当 API 返回错误时，应返回一个 FacadeError', async () => {
      const apiError = new Error('API 错误')
      mockedBilibiliApi.getCollectionAllContents.mockReturnValue(err(apiError))

      const result = await facade.fetchRemotePlaylistMetadata(123, 'collection')

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.name).toBe('FacadeError')
      expect(error.type).toBe('fetchRemotePlaylistMetadataFailed')
      expect(error.cause).toBe(apiError)
    })

    it('当类型未知时，应返回一个 FacadeError', async () => {
      // @ts-expect-error test for unknown type
      const result = await facade.fetchRemotePlaylistMetadata(123, 'unknown_type')

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.name).toBe('FacadeError')
      expect(error.type).toBe('fetchRemotePlaylistMetadataFailed')
      expect(error.message).toContain('未知的播放列表类型')
    })
  })
})