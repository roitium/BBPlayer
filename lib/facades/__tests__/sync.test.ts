
import { jest } from '@jest/globals'
import type {
  BilibiliCollectionAllContents,
  BilibiliFavoriteListContent,
  BilibiliFavoriteListItem,
  BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { Playlist } from '@/types/core/media'
import type { Artist, RemoteArtist } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { ok, okAsync } from 'neverthrow'
import { bilibiliApi } from '../../api/bilibili/api'
import db from '../../db/db'
import { artistService } from '../../services/artistService'
import generateUniqueTrackKey from '../../services/genKey'
import { playlistService } from '../../services/playlistService'
import { trackService } from '../../services/trackService'
import { SyncFacade } from '../sync'

jest.mock('@/utils/log')
jest.mock('../../api/bilibili/api')
jest.mock('../../db/db')
jest.mock('../../services/trackService')
jest.mock('../../services/playlistService')
jest.mock('../../services/artistService')
jest.mock('../../services/genKey')
// Mock the av2bv and bv2av utils
jest.mock('../../api/bilibili/utils', () => ({
  av2bv: (av: number) => `bv${av}`,
  bv2av: (bv: string) => parseInt(bv.substring(2), 10),
}))

const mockedTrackService = trackService as jest.Mocked<typeof trackService>
const mockedBilibiliApi = bilibiliApi as jest.Mocked<typeof bilibiliApi>
const mockedPlaylistService =
  playlistService as jest.Mocked<typeof playlistService>
const mockedArtistService = artistService as jest.Mocked<typeof artistService>
const mockedDb = db as jest.Mocked<typeof db>
const mockedGenerateUniqueTrackKey =
  generateUniqueTrackKey as jest.MockedFunction<typeof generateUniqueTrackKey>

describe('SyncFacade', () => {
  let facade: SyncFacade

  beforeEach(() => {
    jest.clearAllMocks()
    mockedPlaylistService.withDB.mockReturnValue(mockedPlaylistService)
    mockedTrackService.withDB.mockReturnValue(mockedTrackService)
    mockedArtistService.withDB.mockReturnValue(mockedArtistService)
    mockedGenerateUniqueTrackKey.mockClear()

    facade = new SyncFacade(
      mockedTrackService,
      mockedBilibiliApi,
      mockedPlaylistService,
      mockedArtistService,
      mockedDb,
    )
  })

  describe('syncCollection', () => {
    it('应成功同步合集', async () => {
      const collectionId = 123
      const playlistId = 1
      const mockApiData = {
        info: {
          id: collectionId,
          title: '测试合集',
          intro: '描述',
          cover: 'cover.jpg',
          upper: { mid: 1, name: 'UP主' },
        },
        medias: [
          {
            bvid: 'bv1',
            title: '视频1',
            cover: 'cover1.jpg',
            duration: 100,
            upper: { mid: 2, name: '作者1' },
          },
        ],
      } as BilibiliCollectionAllContents
      mockedBilibiliApi.getCollectionAllContents.mockReturnValue(
        okAsync(mockApiData),
      )
      mockedArtistService.findOrCreateArtist.mockResolvedValue(
        ok({ id: 1 } as Artist),
      )
      mockedPlaylistService.findOrCreateRemotePlaylist.mockResolvedValue(
        ok({ id: playlistId } as Playlist),
      )
      mockedArtistService.findOrCreateManyRemoteArtists.mockResolvedValue(
        ok(new Map([['2', { id: 2 } as RemoteArtist]])),
      )
      mockedTrackService.findOrCreateManyTracks.mockResolvedValue(
        ok(new Map([['key', 101]])),
      )
      mockedPlaylistService.replacePlaylistAllTracks.mockResolvedValue(ok(true))

      const result = await facade.syncCollection(collectionId)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(playlistId)
      expect(mockedBilibiliApi.getCollectionAllContents).toHaveBeenCalledWith(
        collectionId,
      )
      expect(
        mockedPlaylistService.replacePlaylistAllTracks,
      ).toHaveBeenCalledWith(playlistId, [101])
    })

    it('当同步任务已在运行时，应返回错误', async () => {
      mockedBilibiliApi.getCollectionAllContents.mockReturnValue(
        new Promise<never>(() => {
          /* do nothing */
        }),
      )

      // "Start" a sync, but don't await it.
      void facade.syncCollection(123)

      // Try to start it again. This time it should fail immediately.
      const result = await facade.syncCollection(123)

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('SyncTaskAlreadyRunning')
    })
  })

  describe('syncMultiPageVideo', () => {
    it('应成功同步多P视频', async () => {
      const bvid = 'bv123'
      const playlistId = 1
      const mockApiData = {
        title: '多P视频',
        desc: '描述',
        pic: 'cover.jpg',
        owner: { mid: 1, name: 'UP主', face: 'face.jpg' },
        pages: [
          { cid: 101, part: 'P1', duration: 100 },
          { cid: 102, part: 'P2', duration: 200 },
        ],
      } as BilibiliVideoDetails
      mockedBilibiliApi.getVideoDetails.mockReturnValue(okAsync(mockApiData))
      mockedArtistService.findOrCreateArtist.mockResolvedValue(
        ok({ id: 1 } as Artist),
      )
      mockedPlaylistService.findOrCreateRemotePlaylist.mockResolvedValue(
        ok({ id: playlistId } as Playlist),
      )
      mockedTrackService.findOrCreateManyTracks.mockResolvedValue(
        ok(
          new Map([
            ['k1', 101],
            ['k2', 102],
          ]),
        ),
      )
      mockedPlaylistService.replacePlaylistAllTracks.mockResolvedValue(ok(true))

      const result = await facade.syncMultiPageVideo(bvid)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(playlistId)
      expect(mockedBilibiliApi.getVideoDetails).toHaveBeenCalledWith(bvid)
      expect(
        mockedPlaylistService.replacePlaylistAllTracks,
      ).toHaveBeenCalledWith(playlistId, [101, 102])
    })
  })

  describe('syncFavorite', () => {
    const favoriteId = 789
    beforeEach(() => {
      const mockAllContents: BilibiliFavoriteListItem[] = [
        { bvid: 'bv1', type: 2 } as BilibiliFavoriteListItem,
      ]
      mockedBilibiliApi.getFavoriteListAllContents.mockReturnValue(
        okAsync(mockAllContents),
      )
      const mockContents = {
        info: {
          id: favoriteId,
          title: '收藏夹',
          intro: '描述',
          cover: 'cover.jpg',
          upper: { mid: 1, name: 'UP主', face: 'face.jpg' },
        },
        medias: [
          {
            bvid: 'bv1',
            upper: { mid: 2, name: '作者' },
          } as BilibiliFavoriteListContent,
        ],
        has_more: false,
      } as BilibiliFavoriteListContents
      mockedBilibiliApi.getFavoriteListContents.mockReturnValue(
        okAsync(mockContents),
      )
      // Mock service calls
      mockedPlaylistService.findPlaylistByTypeAndRemoteId.mockResolvedValue(
        ok(undefined),
      ) // Assume no local playlist exists initially
      mockedArtistService.findOrCreateArtist.mockResolvedValue(
        ok({ id: 1 } as Artist),
      )
      mockedPlaylistService.findOrCreateRemotePlaylist.mockResolvedValue(
        ok({ id: 1 } as Playlist),
      )
      mockedArtistService.findOrCreateManyRemoteArtists.mockResolvedValue(
        ok(new Map([['2', { id: 2 } as RemoteArtist]])),
      )
      mockedTrackService.findOrCreateManyTracks.mockResolvedValue(
        ok(new Map([['key', 101]])),
      )
      mockedTrackService.findTrackIdsByUniqueKeys.mockResolvedValue(
        ok(new Map([['uniqueKeyFor-bv1', 101]])),
      )
      mockedPlaylistService.replacePlaylistAllTracks.mockResolvedValue(ok(true))

      // Mock generateUniqueTrackKey to return a predictable value
      mockedGenerateUniqueTrackKey.mockImplementation(
        (p: CreateTrackPayload) => {
          if (p.bilibiliMetadata) {
            return ok(`uniqueKeyFor-${p.bilibiliMetadata.bvid}`)
          }
          return ok('some-key')
        },
      )
    })

    it('应成功同步收藏夹', async () => {
      const result = await facade.syncFavorite(favoriteId)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(1)
      expect(
        mockedPlaylistService.replacePlaylistAllTracks,
      ).toHaveBeenCalledWith(1, [101])
    })
  })

  describe('sync', () => {
    it('应根据类型调用正确的同步方法', async () => {
      const syncFavoriteSpy = jest
        .spyOn(facade, 'syncFavorite')
        .mockResolvedValue(ok(1))
      const syncCollectionSpy = jest
        .spyOn(facade, 'syncCollection')
        .mockResolvedValue(ok(2))
      const syncMultiPageVideoSpy = jest
        .spyOn(facade, 'syncMultiPageVideo')
        .mockResolvedValue(ok(3))

      await facade.sync(123, 'favorite')
      expect(syncFavoriteSpy).toHaveBeenCalledWith(123)

      await facade.sync(456, 'collection')
      expect(syncCollectionSpy).toHaveBeenCalledWith(456)

      await facade.sync(789, 'multi_page')
      expect(syncMultiPageVideoSpy).toHaveBeenCalledWith('bv789')
    })
  })
})