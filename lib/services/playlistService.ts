import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { Playlist, Track } from '@/types/core/media'
import type {
	CreatePlaylistPayload,
	ReorderSingleTrackPayload,
	UpdatePlaylistPayload,
} from '@/types/services/playlist'
import db from '../db/db'
import * as schema from '../db/schema'
import {
	DatabaseError,
	ServiceError,
	createPlaylistNotFound,
	createTrackNotInPlaylist,
	createValidationError,
} from '../errors/service'
import type { TrackService } from './trackService'
import { trackService } from './trackService'

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
					title: payload.title,
					authorId: payload.authorId,
					description: payload.description,
					coverUrl: payload.coverUrl,
					type: payload.type,
					remoteSyncId: payload.remoteSyncId,
				} satisfies CreatePlaylistPayload)
				.returning(),
			(e) => new DatabaseError('创建播放列表失败', { cause: e }),
		).andThen((result) => {
			return okAsync(result[0])
		})
	}

	/**
	 * 更新一个播放列表元数据。
	 * @param playlistId - 要更新的播放列表的 ID。
	 * @param payload - 更新所需的数据。
	 * @returns ResultAsync 包含更新后的 Playlist 或一个错误。
	 */
	public updatePlaylistMetadata(
		playlistId: number,
		payload: UpdatePlaylistPayload,
	): ResultAsync<
		typeof schema.playlists.$inferSelect,
		DatabaseError | ServiceError
	> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证播放列表是否存在
				const existing = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						// eq(schema.playlists.type, 'local'),
					),
				})
				if (!existing) {
					throw createPlaylistNotFound(playlistId)
				}

				const [updated] = await this.db
					.update(schema.playlists)
					.set({
						title: payload.title ?? undefined,
						description: payload.description,
						coverUrl: payload.coverUrl,
					} satisfies UpdatePlaylistPayload)
					.where(eq(schema.playlists.id, playlistId))
					.returning()

				return updated
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`更新播放列表 ${playlistId} 失败`, { cause: e }),
		)
	}

	/**
	 * 删除一个播放列表。
	 * @param playlistId - 要删除的播放列表的 ID。
	 * @returns ResultAsync 包含删除的 ID 或一个错误。
	 */
	public deletePlaylist(
		playlistId: number,
	): ResultAsync<{ deletedId: number }, DatabaseError | ServiceError> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证播放列表是否存在
				const existing = await this.db.query.playlists.findFirst({
					where: and(eq(schema.playlists.id, playlistId)),
					columns: { id: true },
				})
				if (!existing) {
					throw createPlaylistNotFound(playlistId)
				}

				const [deleted] = await this.db
					.delete(schema.playlists)
					.where(eq(schema.playlists.id, playlistId))
					.returning({ deletedId: schema.playlists.id })

				return deleted
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`删除播放列表 ${playlistId} 失败`, { cause: e }),
		)
	}

	/**
	 * 批量添加 tracks 到本地播放列表。
	 */
	public addManyTracksToLocalPlaylist(
		playlistId: number,
		trackIds: number[],
	): ResultAsync<
		(typeof schema.playlistTracks.$inferSelect)[],
		DatabaseError | ServiceError
	> {
		if (trackIds.length === 0) {
			return okAsync([])
		}

		return ResultAsync.fromPromise(
			(async () => {
				// 验证播放列表是否存在且为 local
				const playlist = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						eq(schema.playlists.type, 'local'),
					),
					columns: { id: true, itemCount: true },
				})
				if (!playlist) {
					throw createPlaylistNotFound(playlistId)
				}

				// 获取当前最大 order
				const maxOrderResult = await this.db
					.select({
						maxOrder: sql<number | null>`MAX(${schema.playlistTracks.order})`,
					})
					.from(schema.playlistTracks)
					.where(eq(schema.playlistTracks.playlistId, playlistId))
				let nextOrder = (maxOrderResult[0].maxOrder ?? -1) + 1

				// 构造批量插入的行
				const values = trackIds.map((tid) => ({
					playlistId,
					trackId: tid,
					order: nextOrder++,
				}))

				// 批量插入（忽略已存在的）
				const inserted = await this.db
					.insert(schema.playlistTracks)
					.values(values)
					.onConflictDoNothing({
						target: [
							schema.playlistTracks.playlistId,
							schema.playlistTracks.trackId,
						],
					})
					.returning()

				// 更新播放列表的 itemCount（+ 成功插入的数量）
				if (inserted.length > 0) {
					await this.db
						.update(schema.playlists)
						.set({
							itemCount: sql`${schema.playlists.itemCount} + ${inserted.length}`,
						})
						.where(eq(schema.playlists.id, playlistId))
				}

				return inserted
			})(),
			(e) => new DatabaseError('批量添加歌曲到播放列表失败', { cause: e }),
		)
	}

	/**
	 * 从本地播放列表批量移除歌曲
	 * @param playlistId - 目标播放列表的 ID。
	 * @param trackIdList - 要移除的歌曲的 ID 们
	 * @returns [removedTrackIds, missingTrackIds] 分别为被移除的 ID 和不在播放列表中的 ID
	 */
	public batchRemoveTracksFromLocalPlaylist(
		playlistId: number,
		trackIdList: number[],
	): ResultAsync<
		{ removedTrackIds: number[]; missingTrackIds: number[] },
		DatabaseError | ServiceError
	> {
		return ResultAsync.fromPromise(
			(async () => {
				if (trackIdList.length === 0) {
					return { removedTrackIds: [], missingTrackIds: [] }
				}

				// 验证播放列表是否存在且为 'local'
				const playlist = await this.db.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						eq(schema.playlists.type, 'local'),
					),
					columns: { id: true },
				})
				if (!playlist) {
					throw createPlaylistNotFound(playlistId)
				}

				// 2) 批量删除关联记录，并拿到实际删除的 trackId
				const deletedLinks = await this.db
					.delete(schema.playlistTracks)
					.where(
						and(
							eq(schema.playlistTracks.playlistId, playlistId),
							inArray(schema.playlistTracks.trackId, trackIdList),
						),
					)
					.returning({ trackId: schema.playlistTracks.trackId })

				const removedTrackIds = deletedLinks.map((x) => x.trackId)
				const removedCount = removedTrackIds.length

				if (removedCount === 0) {
					throw createTrackNotInPlaylist(trackIdList[0], playlistId)
				}

				// 更新 itemCount（不小于 0）
				await this.db
					.update(schema.playlists)
					.set({
						itemCount: sql`MAX(0, ${schema.playlists.itemCount} - ${removedCount})`,
					})
					.where(eq(schema.playlists.id, playlistId))

				// 计算 missing 列表（传入但未删除，说明本就不在该列表）
				const removedSet = new Set(removedTrackIds)
				const missingTrackIds = trackIdList.filter((id) => !removedSet.has(id))

				return { removedTrackIds, missingTrackIds }
			})(),
			(e) => {
				if (e instanceof ServiceError) return e
				return new DatabaseError('从播放列表批量移除歌曲的事务失败', {
					cause: e,
				})
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
	): ResultAsync<true, DatabaseError | ServiceError> {
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
					throw createPlaylistNotFound(playlistId)
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
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('重排序播放列表歌曲的事务失败', { cause: e }),
		)
	}

	/**
	 * 获取播放列表中的所有歌曲
	 * @param playlistId - 目标播放列表的 ID。
	 * @returns ResultAsync
	 */
	public getPlaylistTracks(
		playlistId: number,
	): ResultAsync<Track[], DatabaseError | ServiceError> {
		return ResultAsync.fromPromise(
			(async () => {
				const type = await this.db.query.playlists.findFirst({
					columns: { type: true },
					where: eq(schema.playlists.id, playlistId),
				})
				if (!type) throw createPlaylistNotFound(playlistId)
				const orderBy =
					type.type === 'local'
						? desc(schema.playlistTracks.order)
						: asc(schema.playlistTracks.order)

				return this.db.query.playlistTracks.findMany({
					where: eq(schema.playlistTracks.playlistId, playlistId),
					orderBy: orderBy,
					with: {
						track: {
							with: {
								artist: true,
								bilibiliMetadata: true,
								localMetadata: true,
							},
						},
					},
				})
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('获取播放列表歌曲的事务失败', { cause: e }),
		).andThen((data) => {
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
	}

	/**
	 * 获取所有 playlists
	 */
	public getAllPlaylists(): ResultAsync<
		(typeof schema.playlists.$inferSelect & {
			author: typeof schema.artists.$inferSelect | null
		})[],
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findMany({
				orderBy: desc(schema.playlists.updatedAt),
				with: {
					author: true,
				},
			}),
			(e) => new DatabaseError('获取所有 playlists 失败', { cause: e }),
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
			(e) => new DatabaseError('获取 playlist 元数据失败', { cause: e }),
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
		DatabaseError | ServiceError
	> {
		const { remoteSyncId, type } = payload
		if (!remoteSyncId || type === 'local') {
			return errAsync(
				createValidationError(
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
						title: payload.title,
						authorId: payload.authorId,
						description: payload.description,
						coverUrl: payload.coverUrl,
						type: payload.type,
						remoteSyncId: payload.remoteSyncId,
					} satisfies CreatePlaylistPayload)
					.returning()

				return newPlaylist
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('查找或创建播放列表的事务失败', { cause: e }),
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
			(e) =>
				new DatabaseError(`设置播放列表歌曲失败 (ID: ${playlistId})`, {
					cause: e,
				}),
		)
	}

	/**
	 * 基于 type & remoteId 查询一个播放列表
	 * @param type
	 * @param remoteId
	 */
	public findPlaylistByTypeAndRemoteId(
		type: Playlist['type'],
		remoteId: number,
	): ResultAsync<
		| (typeof schema.playlists.$inferSelect & {
				trackLinks: (typeof schema.playlistTracks.$inferSelect)[]
		  })
		| undefined,
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findFirst({
				where: and(
					eq(schema.playlists.type, type),
					eq(schema.playlists.remoteSyncId, remoteId),
				),
				with: {
					trackLinks: true,
				},
			}),
			(e) => new DatabaseError('查询播放列表失败', { cause: e }),
		)
	}

	/**
	 * 根据 ID 获取播放列表
	 * @param playlistId
	 */
	public getPlaylistById(playlistId: number) {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findFirst({
				where: eq(schema.playlists.id, playlistId),
				with: {
					author: true,
					trackLinks: true,
				},
			}),
			(e) => new DatabaseError('查询播放列表失败', { cause: e }),
		)
	}

	/**
	 * 通过 uniqueKey 获取包含指定歌曲的所有本地播放列表
	 * @param uniqueKey:  track uniqueKey
	 */
	public getLocalPlaylistsContainingTrackByUniqueKey(
		uniqueKey: string,
	): ResultAsync<(typeof schema.playlists.$inferSelect)[], DatabaseError> {
		return this.trackService
			.findTrackIdsByUniqueKeys([uniqueKey])
			.andThen((trackIds) => {
				if (!trackIds.has(uniqueKey)) return okAsync([])
				return ResultAsync.fromPromise(
					this.db.query.playlists.findMany({
						where: and(
							eq(schema.playlists.type, 'local'),
							inArray(
								schema.playlists.id,
								this.db
									.select({ playlistId: schema.playlistTracks.playlistId })
									.from(schema.playlistTracks)
									.where(
										eq(schema.playlistTracks.trackId, trackIds.get(uniqueKey)!),
									),
							),
						),
					}),
					(e) =>
						new DatabaseError('获取包含该歌曲的本地播放列表失败', { cause: e }),
				)
			})
	}

	/**
	 * 获取包含指定歌曲的所有本地播放列表
	 * @param trackId:  track id（number）
	 */
	public getLocalPlaylistsContainingTrackById(
		trackId: number,
	): ResultAsync<(typeof schema.playlists.$inferSelect)[], DatabaseError> {
		return ResultAsync.fromPromise(
			this.db.query.playlists.findMany({
				where: and(
					eq(schema.playlists.type, 'local'),
					inArray(
						schema.playlists.id,
						this.db
							.select({ playlistId: schema.playlistTracks.playlistId })
							.from(schema.playlistTracks)
							.where(eq(schema.playlistTracks.trackId, trackId)),
					),
				),
			}),
			(e) =>
				new DatabaseError('获取包含该歌曲的本地播放列表失败', { cause: e }),
		)
	}

	/**
	 * 在某个 playlist 中依据名字搜索歌曲
	 * @param playlistId
	 * @param query
	 */
	public searchTrackInPlaylist(
		playlistId: number,
		query: string,
	): ResultAsync<Track[], DatabaseError | ServiceError> {
		const q = `%${query.trim().toLowerCase()}%`

		return ResultAsync.fromPromise(
			(async () => {
				const trackIdSubq = db
					.select({ id: schema.tracks.id })
					.from(schema.tracks)
					.leftJoin(
						schema.artists,
						eq(schema.tracks.artistId, schema.artists.id),
					)
					.where(like(sql`lower(${schema.tracks.title})`, q))

				const rows = await db.query.playlistTracks.findMany({
					where: and(
						eq(schema.playlistTracks.playlistId, playlistId),
						inArray(schema.playlistTracks.trackId, trackIdSubq),
					),
					with: {
						track: {
							columns: {
								playHistory: false,
							},
							with: {
								artist: true,
								bilibiliMetadata: true,
								localMetadata: true,
							},
						},
					},
					orderBy: asc(schema.playlistTracks.order),
				})

				const newTracks = []
				for (const row of rows) {
					const t = this.trackService.formatTrack({
						...row.track,
						playHistory: [],
					})
					if (!t)
						throw new ServiceError(
							`在格式化歌曲：${row.track.id} 时出错，可能是原数据不存在或 source & metadata 不匹配`,
						)
					newTracks.push(t)
				}
				return newTracks
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('搜索歌曲失败', { cause: e }),
		)
	}
}

export const playlistService = new PlaylistService(db, trackService)
