import { Track } from '@/types/core/media'
import log from '@/utils/log'
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync } from 'neverthrow'
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

	public syncCollection(collectionId: number) {
		logger.debug('syncCollection', { collectionId })
		return this.bilibiliApi
			.getCollectionAllContents(collectionId)
			.andTee(() =>
				logger.debug('step 1: 调用 bilibiliapi getCollectionAllContents 完成'),
			)
			.andThen((contents) => {
				return ResultAsync.fromPromise(
					this.db.transaction(async (tx) => {
						const playlistSvc = this.playlistService.withDB(tx)
						const trackSvc = this.trackService.withDB(tx)
						const artistSvc = this.artistService.withDB(tx)

						const playlistArtistId = await artistSvc.findOrCreateArtist({
							name: contents.info.upper.name,
							source: 'bilibili',
							remoteId: String(contents.info.upper.mid),
						})
						if (playlistArtistId.isErr()) throw playlistArtistId.error

						const playlistRes = await playlistSvc.findOrCreateRemotePlaylist({
							title: contents.info.title,
							description: contents.info.intro,
							coverUrl: contents.info.cover,
							type: 'collection',
							remoteSyncId: collectionId,
							authorId: playlistArtistId.value.id,
						})
						if (playlistRes.isErr()) throw playlistRes.error
						logger.debug('step 2: 创建 playlist 和其对应的 artist 信息完成', {
							id: playlistRes.value.id,
						})

						const uniqueArtists = new Map<number, { name: string }>()
						for (const media of contents.medias) {
							if (!uniqueArtists.has(media.upper.mid)) {
								uniqueArtists.set(media.upper.mid, { name: media.upper.name })
							}
						}

						const artistRes = await artistSvc.findOrCreateManyRemoteArtists(
							Array.from(uniqueArtists, ([remoteId, artistInfo]) => ({
								name: artistInfo.name,
								source: 'bilibili',
								remoteId: String(remoteId),
								avatarUrl: undefined,
							})),
						)
						if (artistRes.isErr()) throw artistRes.error
						const localArtistIdMap = artistRes.value
						logger.debug('step 3: 创建 artist 完成', {
							uniqueCount: uniqueArtists.size,
						})

						const trackIds = await trackSvc.findOrCreateManyTracks(
							contents.medias.map((v) => ({
								title: v.title,
								source: 'bilibili',
								bilibiliMetadata: {
									bvid: v.bvid,
									isMultiPart: false,
									cid: undefined,
								},
								coverUrl: v.cover,
								duration: v.duration,
								artistId: localArtistIdMap.get(String(v.upper.mid))?.id,
							})),
							'bilibili',
						)
						if (trackIds.isErr()) throw trackIds.error
						logger.debug('step 4: 创建 tracks 完成', {
							total: trackIds.value.length,
						})

						playlistSvc.replacePlaylistAllTracks(
							playlistRes.value.id,
							trackIds.value,
						)
						logger.debug('step 5: 替换 playlist 中所有 tracks 完成')
						logger.info('同步合集完成', {
							remoteId: contents.info.id,
							playlistId: playlistRes.value.id,
						})
						return playlistRes.value.id
					}),
					(e) => new FacadeError('同步合集失败', e),
				)
			})
	}
}
