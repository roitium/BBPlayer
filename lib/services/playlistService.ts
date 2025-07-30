import { and, eq, sql } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import { Track } from '@/types/core/media'
import {
	CreatePlaylistPayload,
	ReorderSingleTrackPayload,
	UpdatePlaylistPayload,
} from '@/types/services/playlist'
import { CreateTrackPayload } from '@/types/services/track'
import db from '../db/db'
import * as schema from '../db/schema'
import {
	DatabaseError,
	PlaylistNotFoundError,
	ServiceError,
	TrackAlreadyExistsError,
	TrackNotInPlaylistError,
	ValidationError,
} from './errors'
import { TrackService, trackService } from './trackService'

/**
 * 对于内部 tracks 的增删改操作只有 local playlist 才可以，注意方法名。
 */
export class PlaylistService {
	private readonly db: ExpoSQLiteDatabase<typeof schema>
	private readonly trackService: TrackService

	constructor(
		db: ExpoSQLiteDatabase<typeof schema>,
		trackService: TrackService,
	) {
		this.db = db
		this.trackService = trackService
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
			this.db.transaction(async (tx) => {
				// 验证播放列表是否存在且为 'local' 类型
				const existing = await tx.query.playlists.findFirst({
					where: and(
						eq(schema.playlists.id, playlistId),
						eq(schema.playlists.type, 'local'),
					),
				})
				if (!existing) {
					throw new PlaylistNotFoundError(playlistId)
				}

				const [updated] = await tx
					.update(schema.playlists)
					.set(payload)
					.where(eq(schema.playlists.id, playlistId))
					.returning()

				return updated
			}),
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
			this.db.transaction(async (tx) => {
				// 验证播放列表是否存在
				const existing = await tx.query.playlists.findFirst({
					where: and(eq(schema.playlists.id, playlistId)),
					columns: { id: true },
				})
				if (!existing) {
					throw new PlaylistNotFoundError(playlistId)
				}

				const [deleted] = await tx
					.delete(schema.playlists)
					.where(eq(schema.playlists.id, playlistId))
					.returning({ deletedId: schema.playlists.id })

				return deleted
			}),
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
		DatabaseError | ValidationError | ServiceError
	> {
		const trackResult = this.trackService.findOrCreateTrack(trackPayload)

		return trackResult.andThen((track) => {
			// 在事务中处理播放列表的逻辑
			return ResultAsync.fromPromise(
				this.db.transaction(async (tx) => {
					// 验证播放列表是否存在且为 'local'
					const playlist = await tx.query.playlists.findFirst({
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
					const existingLink = await tx.query.playlistTracks.findFirst({
						where: and(
							eq(schema.playlistTracks.playlistId, playlistId),
							eq(schema.playlistTracks.trackId, track.id),
						),
					})
					if (existingLink) {
						throw new TrackAlreadyExistsError(track.id, playlistId)
					}

					// 获取新的排序号
					const maxOrderResult = await tx
						.select({
							maxOrder: sql<number>`MAX(${schema.playlistTracks.order})`,
						})
						.from(schema.playlistTracks)
						.where(eq(schema.playlistTracks.playlistId, playlistId))
					const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

					// 插入关联记录
					const [newLink] = await tx
						.insert(schema.playlistTracks)
						.values({
							playlistId: playlistId,
							trackId: track.id,
							order: nextOrder,
						})
						.returning()

					// 更新播放列表的 itemCount
					await tx
						.update(schema.playlists)
						.set({ itemCount: sql`${schema.playlists.itemCount} + 1` })
						.where(eq(schema.playlists.id, playlistId))

					return newLink
				}),
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
			this.db.transaction(async (tx) => {
				// 删除关联记录
				const [deletedLink] = await tx
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
				await tx
					.update(schema.playlists)
					.set({ itemCount: sql`MAX(0, ${schema.playlists.itemCount} - 1)` })
					.where(eq(schema.playlists.id, playlistId))

				return deletedLink
			}),
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
			this.db.transaction(async (tx) => {
				const playlist = await tx.query.playlists.findFirst({
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
				const trackToMove = await tx.query.playlistTracks.findFirst({
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
					await tx
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
					await tx
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
				await tx
					.update(schema.playlistTracks)
					.set({ order: toOrder })
					.where(
						and(
							eq(schema.playlistTracks.playlistId, playlistId),
							eq(schema.playlistTracks.trackId, trackId),
						),
					)

				return true
			}),
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
		return ResultAsync.fromPromise(
			this.db.query.playlistTracks.findMany({
				where: eq(schema.playlistTracks.playlistId, playlistId),
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
}

export const playlistService = new PlaylistService(db, trackService)
