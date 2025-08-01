import { Track } from '@/types/core/media'
import log from '@/utils/log'
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { errAsync, ResultAsync } from 'neverthrow'
import { bilibiliApi as BilibiliApiService } from '../api/bilibili/api'
import { BilibiliApiError } from '../core/errors/bilibili'
import { FacadeError } from '../core/errors/facade'
import {
	DatabaseError,
	TrackNotFoundError,
	ValidationError,
} from '../core/errors/service'
import * as schema from '../db/schema'
import { ArtistService } from '../services/artistService'
import { PlaylistService } from '../services/playlistService'
import { TrackService } from '../services/trackService'

const logger = log.extend('Facade')

export class Facade {
	constructor(
		private readonly trackService: TrackService,
		private readonly bilibiliApi: typeof BilibiliApiService,
		private readonly playlistService: PlaylistService,
		private readonly artistService: ArtistService,
		private readonly db: ExpoSQLiteDatabase<typeof schema>,
	) {}

	/**
	 * 从 Bilibili API 获取视频信息，并创建一个新的音轨。
	 * @param bvid
	 * @param cid 基于 cid 是否存在判断 isMultiPart 的值
	 * @returns
	 */
	public addTrackFromBilibiliApi(
		bvid: string,
		cid?: number,
	): ResultAsync<
		Track,
		TrackNotFoundError | DatabaseError | BilibiliApiError | ValidationError
	> {
		const apiData = this.bilibiliApi.getVideoDetails(bvid)
		return apiData.andThen((data) => {
			const trackPayload = {
				title: data.title,
				source: 'bilibili' as const,
				bilibiliMetadata: {
					bvid,
					cid,
					isMultiPart: cid !== undefined,
				},
				coverUrl: data.pic,
				duration: data.duration,
				artist: {
					id: data.owner.mid,
					name: data.owner.name,
					source: 'bilibili' as const,
				},
			}
			return this.trackService.findOrCreateTrack(trackPayload)
		})
	}

	public async syncCollection(collectionId: number) {
		logger.debug('syncCollection', { collectionId })
		const contents =
			await this.bilibiliApi.getCollectionAllContents(collectionId)
		if (contents.isErr()) return errAsync(contents.error)
		logger.debug(
			'step 1: fetch getCollectionAllContents from bilibili api done',
		)

		return ResultAsync.fromPromise(
			this.db.transaction(async (tx) => {
				const playlistSvc = this.playlistService.withDB(tx)
				const trackSvc = this.trackService.withDB(tx)
				const artistSvc = this.artistService.withDB(tx)

				const playlistRes = await playlistSvc.findOrCreateRemotePlaylist({
					title: contents.value.info.title,
					description: contents.value.info.intro,
					coverUrl: contents.value.info.cover,
					type: 'collection',
					remoteSyncId: collectionId,
				})
				if (playlistRes.isErr()) throw playlistRes.error
				logger.debug('step 2: create playlist done', {
					id: playlistRes.value.id,
				})

				const uniqueArtists = new Map<number, { name: string }>()
				for (const media of contents.value.medias) {
					if (!uniqueArtists.has(media.upper.mid)) {
						uniqueArtists.set(media.upper.mid, { name: media.upper.name })
					}
				}

				const localArtistIdMap = new Map<number, number>()
				for (const [remoteId, artistInfo] of uniqueArtists.entries()) {
					// FIXME: service 层应该提供一个批量创建的接口
					const artistRes = await artistSvc.findOrCreateArtist({
						name: artistInfo.name,
						source: 'bilibili',
						remoteId: String(remoteId),
						avatarUrl: undefined,
					})
					if (artistRes.isErr()) throw artistRes.error
					localArtistIdMap.set(remoteId, artistRes.value.id)
				}
				logger.debug('step 3: create artists done', {
					uniqueCount: uniqueArtists.size,
				})

				const trackIds: number[] = []
				for (const v of contents.value.medias) {
					// FIXME: service 层应该提供一个批量创建的接口
					const trackRes = await trackSvc.findOrCreateTrack({
						title: v.title,
						source: 'bilibili',
						bilibiliMetadata: {
							bvid: v.bvid,
							isMultiPart: false,
							cid: undefined,
						},
						coverUrl: v.cover,
						duration: v.duration,
						artistId: localArtistIdMap.get(v.upper.mid),
					})
					if (trackRes.isErr()) throw trackRes.error
					trackIds.push(trackRes.value.id)
				}
				logger.debug('step 4: create tracks done', { total: trackIds.length })

				playlistSvc.replacePlaylistAllTracks(playlistRes.value.id, trackIds)
				logger.debug('step 5: replace tracks done')
				logger.info('同步合集完成', {
					remoteId: contents.value.info.id,
					playlistId: playlistRes.value.id,
				})
			}),
			(e) => new FacadeError('同步合集失败', e),
		)
	}
}
