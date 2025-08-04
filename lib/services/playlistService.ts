import { and, asc, eq, sql } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import { Track } from '@/types/core/media'
import {
	CreatePlaylistPayload,
	ReorderSingleTrackPayload,
	UpdatePlaylistPayload,
} from '@/types/services/playlist'
import { CreateTrackPayload } from '@/types/services/track'
import log from '@/utils/log'
import {
	DatabaseError,
	PlaylistNotFoundError,
	ServiceError,
	TrackAlreadyExistsError,
	TrackNotInPlaylistError,
	ValidationError,
} from '../core/errors/service'
import db from '../db/db'
import * as schema from '../db/schema'
import { TrackService, trackService } from './trackService'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DBLike = ExpoSQLiteDatabase<typeof schema> | Tx

/**
 * 对于内部 tracks 的增删改操作只有 local playlist 才可以，注意方法名。
 */
export class PlaylistService {
	constructor(
		private readonly db: DBLike,
		private readonly trackService: TrackService,
	) {}

	/**
	 * 返回一个使用新数据库连接（例如事务）的新实例。
	 * @param conn - 新的数据库连接或事务。
	 * @returns 一个新的实例。
	 */
	withDB(conn: DBLike) {
		return new PlaylistService(conn, this.trackService.withDB(conn))
	}

	/**
	 * 创建一个新的播放列表。
	 * @param payload - 创建播放列表所需的数据。
	 * @returns ResultAsync 包含成功创建的 Playlist 或一个错误。
	 */
	public createPlaylist(
		payload: CreatePlaylistPayload,
	): ResultAsync<typeof schema.playlists.$inferSelect, DatabaseError> {
		return ResultAsync.fromPromise(
			this.db
				.insert(schema.playlists)
				.values({
					...payload,
					itemCount: 0,
				})
				.returning(),
			(e) => new DatabaseError('创建播放列表失败', e),
		).andThen((result) => {
			return okAsync(result[0])
		})
	}

	/**
	 * 更新一个**本地**播放列表。
	 * @param playlistId - 要更新的播放列表的 ID。
	 * @param payload - 更新所需的数据。
	 * @returns ResultAsync 包含更新后的 Playlist 或一个错误。
	 */
	public updateLocalPlaylist(
		playlistId: number,
		payload: UpdatePlaylistPayload,
	): ResultAsync<
		typeof schema.playlists.$inferSelect,
		DatabaseError | PlaylistNotFoundError
	> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证播放列表是否存在且为 'local' 类型
				const existing = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						eq(schema.playlists.type, 'local'),
					),
				})
				if (!existing) {
					throw new PlaylistNotFoundError(playlistId)
				}

				const [updated] = await this.db
					.update(schema.playlists)
					.set(payload)
					.where(eq(schema.playlists.id, playlistId))
					.returning()

				return updated
			})(),
			(e) => {
				if (e instanceof PlaylistNotFoundError) return e
				return new DatabaseError(`更新播放列表 ${playlistId} 失败`, e)
			},
		)
	}

	/**
	 * 删除一个播放列表。
	 * @param playlistId - 要删除的播放列表的 ID。
	 * @returns ResultAsync 包含删除的 ID 或一个错误。
	 */
	public deletePlaylist(
		playlistId: number,
	): ResultAsync<{ deletedId: number }, DatabaseError | PlaylistNotFoundError> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证播放列表是否存在
				const existing = await this.db.query.playlists.findFirst({
					where: and(eq(schema.playlists.id, playlistId)),
					columns: { id: true },
				})
				if (!existing) {
					throw new PlaylistNotFoundError(playlistId)
				}

				const [deleted] = await this.db
					.delete(schema.playlists)
					.where(eq(schema.playlists.id, playlistId))
					.returning({ deletedId: schema.playlists.id })

				return deleted
			})(),
			(e) => {
				if (e instanceof PlaylistNotFoundError) return e
				return new DatabaseError(`删除播放列表 ${playlistId} 失败`, e)
			},
		)
	}

	/**
	 * 向本地播放列表添加一首歌曲。
	 * @param playlistId - 目标播放列表的 ID。
	 * @param trackPayload - 用于查找或创建歌曲的数据。
	 * @returns ResultAsync
	 */
	public addTrackToLocalPlaylist(
		playlistId: number,
		trackPayload: CreateTrackPayload,
	): ResultAsync<
		typeof schema.playlistTracks.$inferSelect,
		| DatabaseError
		| ValidationError
		| TrackAlreadyExistsError
		| PlaylistNotFoundError
	> {
		const trackResult = this.trackService.findOrCreateTrack(trackPayload)

		return trackResult.andThen((track) => {
			// 在事务中处理播放列表的逻辑
			return ResultAsync.fromPromise(
				(async () => {
					// 验证播放列表是否存在且为 'local'
					const playlist = await this.db.query.playlists.findFirst({
						where: and(
							eq(schema.playlists.id, playlistId),
							eq(schema.playlists.type, 'local'),
						),
						columns: { id: true },
					})
					if (!playlist) {
						throw new PlaylistNotFoundError(playlistId)
					}

					// 检查歌曲是否已在列表中
					const existingLink = await this.db.query.playlistTracks.findFirst({
						where: and(
							eq(schema.playlistTracks.playlistId, playlistId),
							eq(schema.playlistTracks.trackId, track.id),
						),
					})
					if (existingLink) {
						throw new TrackAlreadyExistsError(track.id, playlistId)
					}

					// 获取新的排序号
					const maxOrderResult = await this.db
						.select({
							maxOrder: sql<number | null>`MAX(${schema.playlistTracks.order})`,
						})
						.from(schema.playlistTracks)
						.where(eq(schema.playlistTracks.playlistId, playlistId))
					const nextOrder = (maxOrderResult[0].maxOrder ?? -1) + 1

					// 插入关联记录
					const [newLink] = await this.db
						.insert(schema.playlistTracks)
						.values({
							playlistId: playlistId,
							trackId: track.id,
							order: nextOrder,
						})
						.returning()

					// 更新播放列表的 itemCount
					await this.db
						.update(schema.playlists)
						.set({ itemCount: sql`${schema.playlists.itemCount} + 1` })
						.where(eq(schema.playlists.id, playlistId))

					return newLink
				})(),
				(e) => {
					if (e instanceof ServiceError) return e
					return new DatabaseError('添加歌曲到播放列表的事务失败', e)
				},
			)
		})
	}

	/**
	 * 从本地播放列表移除一首歌曲。
	 * @param playlistId - 目标播放列表的 ID。
	 * @param trackId - 要移除的歌曲的 ID。
	 * @returns ResultAsync
	 */
	public removeTrackFromLocalPlaylist(
		playlistId: number,
		trackId: number,
	): ResultAsync<{ trackId: number }, DatabaseError | TrackNotInPlaylistError> {
		return ResultAsync.fromPromise(
			(async () => {
				// 删除关联记录
				const [deletedLink] = await this.db
					.delete(schema.playlistTracks)
					.where(
						and(
							eq(schema.playlistTracks.playlistId, playlistId),
							eq(schema.playlistTracks.trackId, trackId),
						),
					)
					.returning({ trackId: schema.playlistTracks.trackId })

				if (!deletedLink) {
					throw new TrackNotInPlaylistError(trackId, playlistId)
				}

				// 更新 itemCount (使用-1，并确保不会变为负数)
				await this.db
					.update(schema.playlists)
					.set({ itemCount: sql`MAX(0, ${schema.playlists.itemCount} - 1)` })
					.where(eq(schema.playlists.id, playlistId))

				return deletedLink
			})(),
			(e) => {
				if (e instanceof ServiceError) return e
				return new DatabaseError('从播放列表移除歌曲的事务失败', e)
			},
		)
	}

	/**
	 * 在本地播放列表中移动单个歌曲的位置。
	 * @param playlistId - 目标播放列表的 ID。
	 * @param payload - 包含歌曲ID、原始位置和目标位置的对象。
	 * @returns ResultAsync
	 */
	public reorderSingleLocalPlaylistTrack(
		playlistId: number,
		payload: ReorderSingleTrackPayload,
	): ResultAsync<true, DatabaseError | ServiceError | PlaylistNotFoundError> {
		const { trackId, fromOrder, toOrder } = payload

		if (fromOrder === toOrder) {
			return okAsync(true)
		}

		return ResultAsync.fromPromise(
			(async () => {
				const playlist = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						eq(schema.playlists.type, 'local'),
					),
					columns: { id: true },
				})
				if (!playlist) {
					throw new PlaylistNotFoundError(playlistId)
				}

				// 验证要移动的歌曲确实在 fromOrder 位置
				const trackToMove = await this.db.query.playlistTracks.findFirst({
					where: and(
						eq(schema.playlistTracks.playlistId, playlistId),
						eq(schema.playlistTracks.trackId, trackId),
						eq(schema.playlistTracks.order, fromOrder),
					),
				})
				if (!trackToMove) {
					// 这也太操蛋了，我觉得我不可能写出这种前后端不一致的代码
					throw new ServiceError(
						`数据不一致：歌曲 ${trackId} 不在播放列表 ${playlistId} 的 ${fromOrder} 位置。`,
					)
				}

				if (toOrder > fromOrder) {
					// 往列表尾部移动
					// 把从 fromOrder+1 到 toOrder 的所有歌曲的 order 都减 1 (向上挪一位)
					await this.db
						.update(schema.playlistTracks)
						.set({ order: sql`${schema.playlistTracks.order} - 1` })
						.where(
							and(
								eq(schema.playlistTracks.playlistId, playlistId),
								sql`${schema.playlistTracks.order} > ${fromOrder}`,
								sql`${schema.playlistTracks.order} <= ${toOrder}`,
							),
						)
				} else {
					// 往列表头部移动
					// 把从 toOrder 到 fromOrder-1 的所有歌曲的 order 都加 1 (向下挪一位)
					await this.db
						.update(schema.playlistTracks)
						.set({ order: sql`${schema.playlistTracks.order} + 1` })
						.where(
							and(
								eq(schema.playlistTracks.playlistId, playlistId),
								sql`${schema.playlistTracks.order} >= ${toOrder}`,
								sql`${schema.playlistTracks.order} < ${fromOrder}`,
							),
						)
				}

				// 把被移动的歌曲放到目标位置
				await this.db
					.update(schema.playlistTracks)
					.set({ order: toOrder })
					.where(
						and(
							eq(schema.playlistTracks.playlistId, playlistId),
							eq(schema.playlistTracks.trackId, trackId),
						),
					)

				return true as const
			})(),
			(e) => {
				if (e instanceof ServiceError) return e
				return new DatabaseError('重排序播放列表歌曲的事务失败', e)
			},
		)
	}

	/**
	 * 获取播放列表中的所有歌曲
	 * @param playlistId - 目标播放列表的 ID。
	 * @returns ResultAsync
	 */
	public getPlaylistTracks(
		playlistId: number,
	): ResultAsync<Track[], DatabaseError | PlaylistNotFoundError> {
		const start = performance.now()
		return ResultAsync.fromPromise(
			this.db.query.playlistTracks.findMany({
				where: eq(schema.playlistTracks.playlistId, playlistId),
				orderBy: asc(schema.playlistTracks.order),
				with: {
					track: {
						with: {
							artist: true,
							bilibiliMetadata: true,
							localMetadata: true,
						},
					},
				},
			}),
			(e) => {
				if (e instanceof ServiceError) return e
				return new DatabaseError('获取播放列表歌曲的事务失败', e)
			},
		)
			.andThen((data) => {
				const newTracks = []
				for (const track of data) {
					const t = this.trackService.formatTrack(track.track)
					if (!t)
						return errAsync(
							new ServiceError(
								`在格式化歌曲：${track.track.id} 时出错，可能是原数据不存在或 source & metadata 不匹配`,
							),
						)
					newTracks.push(t)
				}
				return okAsync(newTracks)
			})
			.andTee(() => {
				const end = performance.now()
				log.debug(`getPlaylistTracks 耗时：${(end - start).toFixed(2)} ms`)
			})
	}

	/**
	 * 获取所有 playlists
	 */
	public getAllPlaylists(): ResultAsync<
		(typeof schema.playlists.$inferSelect)[],
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findMany(),
			(e) => new DatabaseError('获取所有 playlists 失败', e),
		)
	}

	/**
	 * 获取指定 playlist 的元数据
	 * @param playlistId
	 */
	public getPlaylistMetadata(playlistId: number): ResultAsync<
		| (typeof schema.playlists.$inferSelect & {
				author: typeof schema.artists.$inferSelect | null
		  })
		| undefined,
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findFirst({
				where: eq(schema.playlists.id, playlistId),
				with: {
					author: true,
				},
			}),
			(e) => new DatabaseError('获取 playlist 元数据失败', e),
		)
	}

	/**
	 * 根据 remoteSyncId 和 type 查找或创建一个本地同步的远程播放列表。
	 * @param payload - 创建播放列表所需的数据。
	 * @returns ResultAsync 包含找到的或新创建的 Playlist，或一个 DatabaseError。
	 */
	public findOrCreateRemotePlaylist(
		payload: CreatePlaylistPayload,
	): ResultAsync<
		typeof schema.playlists.$inferSelect,
		DatabaseError | ValidationError
	> {
		const { remoteSyncId, type } = payload
		if (!remoteSyncId || type === 'local') {
			return errAsync(
				new ValidationError(
					'无效的 remoteSyncId 或 type，调用 findOrCreateRemotePlaylist 时必须提供 remoteSyncId 和非 local 的 type',
				),
			)
		}
		return ResultAsync.fromPromise(
			(async () => {
				const existingPlaylist = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.remoteSyncId, remoteSyncId),
						eq(schema.playlists.type, type),
					),
				})

				if (existingPlaylist) {
					return existingPlaylist
				}

				const [newPlaylist] = await this.db
					.insert(schema.playlists)
					.values({
						...payload,
						itemCount: 0,
					})
					.returning()

				return newPlaylist
			})(),
			(e) => new DatabaseError('查找或创建播放列表的事务失败', e),
		)
	}

	/**
	 * 使用一个 track ID 数组**完全替换**一个播放列表的内容。并会更新播放列表的 itemCount 和 lastSyncedAt。
	 * @param playlistId 要设置的播放列表 ID。
	 * @param trackIds 有序的歌曲 ID 数组。
	 * @returns ResultAsync
	 */
	public replacePlaylistAllTracks(
		playlistId: number,
		trackIds: number[],
	): ResultAsync<true, DatabaseError> {
		return ResultAsync.fromPromise(
			(async () => {
				await this.db
					.delete(schema.playlistTracks)
					.where(eq(schema.playlistTracks.playlistId, playlistId))

				if (trackIds.length > 0) {
					const newPlaylistTracks = trackIds.map((id, index) => ({
						playlistId: playlistId,
						trackId: id,
						order: index,
					}))
					await this.db.insert(schema.playlistTracks).values(newPlaylistTracks)
				}

				await this.db
					.update(schema.playlists)
					.set({
						itemCount: trackIds.length,
						lastSyncedAt: new Date(),
					})
					.where(eq(schema.playlists.id, playlistId))

				return true as const
			})(),
			(e) => new DatabaseError(`设置播放列表歌曲失败 (ID: ${playlistId})`, e),
		)
	}
}

export const playlistService = new PlaylistService(db, trackService)
