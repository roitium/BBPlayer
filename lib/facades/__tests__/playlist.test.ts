import { jest } from '@jest/globals'
import type {
  Artist,
  CreateArtistPayload,
  RemoteArtist,
} from '@/types/services/artist'
import type { BilibiliTrack, LocalTrack, Playlist } from '@/types/core/media'
import type { CreateTrackPayload } from '@/types/services/track'
import { err, ok } from 'neverthrow'
import { bilibiliApi } from '../../api/bilibili/api'
import db from '../../db/db'
import { artistService } from '../../services/artistService'
import { playlistService } from '../../services/playlistService'
import { trackService } from '../../services/trackService'
import { PlaylistFacade } from '../playlist'

jest.mock('@/utils/log')
jest.mock('../../api/bilibili/api')
jest.mock('../../db/db')
jest.mock('../../services/trackService')
jest.mock('../../services/playlistService')
jest.mock('../../services/artistService')

const mockedTrackService = trackService as jest.Mocked<typeof trackService>
const mockedBilibiliApi = bilibiliApi as jest.Mocked<typeof bilibiliApi>
const mockedPlaylistService =
  playlistService as jest.Mocked<typeof playlistService>
const mockedArtistService = artistService as jest.Mocked<typeof artistService>
const mockedDb = db as jest.Mocked<typeof db>

describe('PlaylistFacade', () => {
  let facade: PlaylistFacade

  beforeEach(() => {
    jest.clearAllMocks()
    mockedPlaylistService.withDB.mockReturnValue(mockedPlaylistService)
    mockedTrackService.withDB.mockReturnValue(mockedTrackService)
    mockedArtistService.withDB.mockReturnValue(mockedArtistService)

    facade = new PlaylistFacade(
      mockedTrackService,
      mockedBilibiliApi,
      mockedPlaylistService,
      mockedArtistService,
      mockedDb,
    )
  })

  describe('duplicatePlaylist', () => {
    it('应成功复制播放列表并返回新的本地播放列表 ID', async () => {
      const sourcePlaylistId = 1
      const newPlaylistName = '我的复制列表'
      const newLocalPlaylistId = 2
      const trackIds = [101, 102]

      mockedPlaylistService.getPlaylistById.mockResolvedValue(
        ok({
          id: sourcePlaylistId,
          title: '源列表',
          description: '描述',
          coverUrl: 'http://cover.url/image.jpg',
        } as Playlist),
      )
      mockedPlaylistService.createPlaylist.mockResolvedValue(
        ok({ id: newLocalPlaylistId } as Playlist),
      )
      mockedPlaylistService.getPlaylistTracks.mockResolvedValue(
        ok(trackIds.map((id) => ({ id, source: 'local' })) as LocalTrack[]),
      )
      mockedPlaylistService.replacePlaylistAllTracks.mockResolvedValue(ok(true))

      const result = await facade.duplicatePlaylist(
        sourcePlaylistId,
        newPlaylistName,
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(newLocalPlaylistId)


      expect(mockedDb.transaction).toHaveBeenCalledTimes(1)

      expect(mockedPlaylistService.getPlaylistById).toHaveBeenCalledWith(
        sourcePlaylistId,
      )

      expect(mockedPlaylistService.createPlaylist).toHaveBeenCalledWith({
        title: newPlaylistName,
        description: '描述',
        coverUrl: 'http://cover.url/image.jpg',
        authorId: null,
        type: 'local',
        remoteSyncId: null,
      })

      expect(mockedPlaylistService.getPlaylistTracks).toHaveBeenCalledWith(
        sourcePlaylistId,
      )

      expect(
        mockedPlaylistService.replacePlaylistAllTracks,
      ).toHaveBeenCalledWith(newLocalPlaylistId, trackIds)
    })

    it('当 Bilibili 视频失效时，应过滤掉这些视频', async () => {
      const sourcePlaylistId = 1
      const newPlaylistName = '我的复制列表'
      const newLocalPlaylistId = 2
      const tracks = [
        { id: 101, source: 'local' } as LocalTrack,
        {
          id: 102,
          source: 'bilibili',
          bilibiliMetadata: { videoIsValid: true },
        } as BilibiliTrack,
        {
          id: 103,
          source: 'bilibili',
          bilibiliMetadata: { videoIsValid: false },
        } as BilibiliTrack,
      ]

      mockedPlaylistService.getPlaylistById.mockResolvedValue(
        ok({ id: 1 } as Playlist),
      )
      mockedPlaylistService.createPlaylist.mockResolvedValue(
        ok({ id: newLocalPlaylistId } as Playlist),
      )
      mockedPlaylistService.getPlaylistTracks.mockResolvedValue(ok(tracks))
      mockedPlaylistService.replacePlaylistAllTracks.mockResolvedValue(ok(true))

      await facade.duplicatePlaylist(sourcePlaylistId, newPlaylistName)


      expect(
        mockedPlaylistService.replacePlaylistAllTracks,
      ).toHaveBeenCalledWith(newLocalPlaylistId, [101, 102])
    })

    it('当任何一个服务调用失败时，应返回 FacadeError', async () => {
      const dbError = new Error('数据库错误')
      mockedPlaylistService.getPlaylistById.mockResolvedValue(err(dbError))

      const result = await facade.duplicatePlaylist(1, '新列表')

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.name).toBe('FacadeError')
      expect(error.type).toBe('PlaylistDuplicateFailed')
      expect(error.cause).toBe(dbError)
    })
  })

  describe('updateTrackLocalPlaylists', () => {
    const trackPayload: CreateTrackPayload = { title: '新歌', source: 'local' }
    const artistPayload: CreateArtistPayload = { name: '新歌手', source: 'local' }
    const toAdd = [1, 2]
    const toRemove = [3]

    it('应成功更新 Track 的播放列表归属，并返回 Track ID', async () => {
      const newArtistId = 10
      const newTrackId = 100

      mockedArtistService.findOrCreateArtist.mockResolvedValue(
        ok({ id: newArtistId } as Artist),
      )
      mockedTrackService.findOrCreateTrack.mockResolvedValue(
        ok({ id: newTrackId } as LocalTrack),
      )
      mockedPlaylistService.addManyTracksToLocalPlaylist.mockResolvedValue(
        ok(true),
      )
      mockedPlaylistService.batchRemoveTracksFromLocalPlaylist.mockResolvedValue(
        ok(true),
      )

      const result = await facade.updateTrackLocalPlaylists({
        toAddPlaylistIds: toAdd,
        toRemovePlaylistIds: toRemove,
        trackPayload,
        artistPayload,
      })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(newTrackId)


      expect(mockedArtistService.findOrCreateArtist).toHaveBeenCalledWith(
        artistPayload,
      )

      expect(mockedTrackService.findOrCreateTrack).toHaveBeenCalledWith({
        ...trackPayload,
        artistId: newArtistId,
      })

      expect(
        mockedPlaylistService.addManyTracksToLocalPlaylist,
      ).toHaveBeenCalledTimes(2)

      expect(
        mockedPlaylistService.addManyTracksToLocalPlaylist,
      ).toHaveBeenCalledWith(1, [newTrackId])

      expect(
        mockedPlaylistService.addManyTracksToLocalPlaylist,
      ).toHaveBeenCalledWith(2, [newTrackId])

      expect(
        mockedPlaylistService.batchRemoveTracksFromLocalPlaylist,
      ).toHaveBeenCalledTimes(1)

      expect(
        mockedPlaylistService.batchRemoveTracksFromLocalPlaylist,
      ).toHaveBeenCalledWith(3, [newTrackId])
    })

    it('当服务调用失败时，应返回 FacadeError', async () => {
      const serviceError = new Error('服务错误')
      mockedArtistService.findOrCreateArtist.mockResolvedValue(err(serviceError))

      const result = await facade.updateTrackLocalPlaylists({
        toAddPlaylistIds: toAdd,
        toRemovePlaylistIds: toRemove,
        trackPayload,
        artistPayload,
      })

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.name).toBe('FacadeError')
      expect(error.type).toBe('UpdateTrackLocalPlaylistsFailed')
      expect(error.cause).toBe(serviceError)
    })
  })

  describe('batchAddTracksToLocalPlaylist', () => {
    const playlistId = 1
    const payloads: { track: CreateTrackPayload; artist: CreateArtistPayload }[] =
      [
        {
          track: { title: '歌1', source: 'bilibili' },
          artist: { name: '歌手1', source: 'bilibili', remoteId: 'remote1' },
        },
        {
          track: { title: '歌2', source: 'bilibili' },
          artist: { name: '歌手2', source: 'bilibili', remoteId: 'remote2' },
        },
      ]

    it('应成功批量添加 tracks 到本地播放列表', async () => {
      const artistMap = new Map<string, RemoteArtist>([
        ['remote1', { id: 10 } as RemoteArtist],
        ['remote2', { id: 11 } as RemoteArtist],
      ])
      const trackMap = new Map<string, number>([
        ['uniqueKey1', 101],
        ['uniqueKey2', 102],
      ])

      mockedArtistService.findOrCreateManyRemoteArtists.mockResolvedValue(
        ok(artistMap),
      )
      mockedTrackService.findOrCreateManyTracks.mockResolvedValue(ok(trackMap))
      mockedPlaylistService.addManyTracksToLocalPlaylist.mockResolvedValue(
        ok(true),
      )

      const result = await facade.batchAddTracksToLocalPlaylist(
        playlistId,
        payloads,
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual([101, 102])


      expect(
        mockedArtistService.findOrCreateManyRemoteArtists,
      ).toHaveBeenCalledWith(payloads.map((p) => p.artist))

      expect(mockedTrackService.findOrCreateManyTracks).toHaveBeenCalledWith(
        [
          { ...payloads[0].track, artistId: 10 },
          { ...payloads[1].track, artistId: 11 },
        ],
        'bilibili',
      )

      expect(
        mockedPlaylistService.addManyTracksToLocalPlaylist,
      ).toHaveBeenCalledWith(playlistId, [101, 102])
    })

    it('当 artist source 为 local 时，应返回验证错误', async () => {
      const invalidPayloads: {
        track: CreateTrackPayload
        artist: CreateArtistPayload
      }[] = [
        {
          track: { title: '歌1', source: 'bilibili' },
          artist: { name: '歌手1', source: 'local' },
        },
      ]

      const result = await facade.batchAddTracksToLocalPlaylist(
        playlistId,
        invalidPayloads,
      )

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.type).toBe('Validation')
    })

    it('当服务调用失败时，应返回 FacadeError', async () => {
      const serviceError = new Error('服务错误')
      mockedArtistService.findOrCreateManyRemoteArtists.mockResolvedValue(
        err(serviceError),
      )

      const result = await facade.batchAddTracksToLocalPlaylist(
        playlistId,
        payloads,
      )

      expect(result.isErr()).toBe(true)
      const error = result._unsafeUnwrapErr()
      expect(error.name).toBe('FacadeError')
      expect(error.type).toBe('BatchAddTracksToLocalPlaylistFailed')
      expect(error.cause).toBe(serviceError)
    })
  })
})