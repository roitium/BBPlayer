import type { Track } from '@/types/core/media'
import log from '@/utils/log'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync } from 'neverthrow'
import type { bilibiliApi as BilibiliApiService } from '../api/bilibili/api'
import { bilibiliApi } from '../api/bilibili/api'
import { bv2av } from '../api/bilibili/utils'
import db from '../db/db'
import type * as schema from '../db/schema'
import type { BilibiliApiError } from '../errors/bilibili'
import { FacadeError } from '../errors/facade'
import type {
	DatabaseError,
	TrackNotFoundError,
	ValidationError,
} from '../errors/service'
import type { ArtistService } from '../services/artistService'
import { artistService } from '../services/artistService'
import type { PlaylistService } from '../services/playlistService'
import { playlistService } from '../services/playlistService'
import type { TrackService } from '../services/trackService'
import { trackService } from '../services/trackService'

let logger = log.extend('Facade')

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
	 * @param cid 基于 cid 是否存在判断 isMultiPage 的值
	 * @returns
	 */
	public addTrackFromBilibiliApi(
		bvid: string,
		cid?: number,
	): ResultAsync<
		Track,
		BilibiliApiError | TrackNotFoundError | DatabaseError | ValidationError
	> {
		const apiData = this.bilibiliApi.getVideoDetails(bvid)
		return apiData.andThen((data) => {
			const trackPayload = {
				title: data.title,
				source: 'bilibili' as const,
				bilibiliMetadata: {
					bvid,
					cid,
					isMultiPage: cid !== undefined,
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

	/**
	 * 同步合集内容
	 * @param collectionId 合集 id
	 * @returns ResultAsync<number, FacadeError>
	 */
	public syncCollection(
		collectionId: number,
	): ResultAsync<number, BilibiliApiError | FacadeError> {
		logger = log.extend('[Facade/SyncCollection: ' + collectionId + ']')
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
									isMultiPage: false,
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

						// 我们不需要去更新 lastSyncedAt 字段，因为在 replacePlaylistAllTracks 中会更新
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

	/**
	 * 同步多集视频
	 * @param bvid
	 */
	public syncMultiPageVideo(
		bvid: string,
	): ResultAsync<number, BilibiliApiError | FacadeError> {
		// HACK: 有空了需要统一一下日志格式，这种 monkeypatch 的方式太不好看了
		logger = log.extend('[Facade/SyncMultiPageVideo: ' + bvid + ']')
		logger.info('syncMultiPageVideo', { bvid })
		return this.bilibiliApi
			.getVideoDetails(bvid)
			.andTee(() =>
				logger.debug('step 1: 调用 bilibiliapi getVideoDetails 完成'),
			)
			.andThen((data) => {
				return ResultAsync.fromPromise(
					this.db.transaction(async () => {
						const playlistSvc = this.playlistService.withDB(this.db)
						const trackSvc = this.trackService.withDB(this.db)
						const artistSvc = this.artistService.withDB(this.db)

						const playlistAuthor = await artistSvc.findOrCreateArtist({
							name: data.owner.name,
							source: 'bilibili',
							remoteId: String(data.owner.mid),
							avatarUrl: data.owner.face,
						})
						if (playlistAuthor.isErr()) throw playlistAuthor.error

						const playlistRes = await playlistSvc.findOrCreateRemotePlaylist({
							title: data.title,
							description: data.desc,
							coverUrl: data.pic,
							type: 'multi_page',
							remoteSyncId: bv2av(bvid),
							authorId: playlistAuthor.value.id,
						})
						if (playlistRes.isErr()) throw playlistRes.error
						logger.debug('step 2: 创建 playlist 和其对应的 artist 信息完成', {
							id: playlistRes.value.id,
						})

						const trackIds = await trackSvc.findOrCreateManyTracks(
							data.pages.map((page) => ({
								title: page.part,
								source: 'bilibili',
								bilibiliMetadata: {
									bvid: bvid,
									isMultiPage: true,
									cid: page.cid,
								},
								coverUrl: data.pic,
								duration: page.duration,
								artistId: playlistAuthor.value.id,
							})),
							'bilibili',
						)
						if (trackIds.isErr()) throw trackIds.error
						logger.debug('step 3: 创建 tracks 完成', {
							total: trackIds.value.length,
						})

						// 我们不需要去更新 lastSyncedAt 字段，因为在 replacePlaylistAllTracks 中会更新
						playlistSvc.replacePlaylistAllTracks(
							playlistRes.value.id,
							trackIds.value,
						)
						logger.debug('step 4: 替换 playlist 中所有 tracks 完成')
						logger.info('同步合集完成', {
							remoteId: bv2av(bvid),
							playlistId: playlistRes.value.id,
						})

						return playlistRes.value.id
					}),
					(e) => new FacadeError('同步多集视频失败', e),
				)
			})
	}
}

export const facade = new Facade(
	trackService,
	bilibiliApi,
	playlistService,
	artistService,
	db,
)
