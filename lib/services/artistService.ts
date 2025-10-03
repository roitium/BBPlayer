import { and, eq, or } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { Track } from '@/types/core/media'
import type {
	CreateArtistPayload,
	UpdateArtistPayload,
} from '@/types/services/artist'
import db from '../db/db'
import * as schema from '../db/schema'
import { ServiceError } from '../errors'
import {
	DatabaseError,
	createArtistNotFound,
	createValidationError,
} from '../errors/service'
import type { TrackService } from './trackService'
import { trackService } from './trackService'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DBLike = ExpoSQLiteDatabase<typeof schema> | Tx

export class ArtistService {
	constructor(
		private readonly db: DBLike,
		private readonly trackService: TrackService,
	) {}

	/**
	 * 返回一个使用新数据库连接（例如事务）的新实例。
	 * @param conn - 新的数据库连接或事务。
	 * @returns 一个新的实例。
	 */
	public withDB(conn: DBLike) {
		return new ArtistService(conn, this.trackService.withDB(conn))
	}

	/**
	 * 创建一个新的artist。
	 * @param payload - 创建artist所需的数据。
	 * @returns ResultAsync 包含成功创建的 Artist 或一个 DatabaseError。
	 */
	public createArtist(
		payload: CreateArtistPayload,
	): ResultAsync<typeof schema.artists.$inferSelect, DatabaseError> {
		return ResultAsync.fromPromise(
			this.db
				.insert(schema.artists)
				.values({
					name: payload.name,
					source: payload.source,
					remoteId: payload.remoteId,
					avatarUrl: payload.avatarUrl,
					signature: payload.signature,
				} satisfies CreateArtistPayload)
				.returning(),
			(e) => new DatabaseError('创建artist失败', { cause: e }),
		).andThen((result) => {
			return okAsync(result[0])
		})
	}

	/**
	 * 根据 source 和 remoteId 查找或创建一个artist。
	 * 主要适用于外部源的数据
	 * @param payload - 用于查找或创建artist的数据，必须包含 source 和 remoteId。
	 * @returns ResultAsync 包含找到的或新创建的 Artist，或一个错误。
	 */
	public findOrCreateArtist(
		payload: CreateArtistPayload,
	): ResultAsync<
		typeof schema.artists.$inferSelect,
		DatabaseError | ServiceError
	> {
		const { source, remoteId } = payload
		if (!source || !remoteId) {
			return errAsync(
				createValidationError('source 和 remoteId 在此方法中是必需的'),
			)
		}

		return ResultAsync.fromPromise(
			(async () => {
				// 尝试查找已存在的artist
				const existingArtist = await this.db.query.artists.findFirst({
					where: and(
						eq(schema.artists.source, source),
						eq(schema.artists.remoteId, remoteId),
					),
				})

				if (existingArtist) {
					return existingArtist
				}

				// 如果不存在，则创建新的artist
				const [newArtist] = await this.db
					.insert(schema.artists)
					.values({
						name: payload.name,
						source: payload.source,
						remoteId: payload.remoteId,
						avatarUrl: payload.avatarUrl,
						signature: payload.signature,
					} satisfies CreateArtistPayload)
					.returning()

				return newArtist
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('查找或创建artist的事务失败', { cause: e }),
		)
	}

	/**
	 * 更新一个artist的信息。
	 * @param artistId - 要更新的artist的 ID。
	 * @param payload - 更新所需的数据。
	 * @returns ResultAsync 包含更新后的 Artist 或一个错误。
	 */
	public updateArtist(
		artistId: number,
		payload: UpdateArtistPayload,
	): ResultAsync<
		typeof schema.artists.$inferSelect,
		DatabaseError | ServiceError
	> {
		return ResultAsync.fromPromise(
			(async () => {
				// 首先验证artist是否存在
				const existing = await this.db.query.artists.findFirst({
					where: eq(schema.artists.id, artistId),
					columns: { id: true },
				})
				if (!existing) {
					throw createArtistNotFound(artistId)
				}

				const [updated] = await this.db
					.update(schema.artists)
					.set({
						name: payload.name ?? undefined,
						avatarUrl: payload.avatarUrl,
						signature: payload.signature,
					} satisfies UpdateArtistPayload)
					.where(eq(schema.artists.id, artistId))
					.returning()

				return updated
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`更新artist ${artistId} 失败`, { cause: e }),
		)
	}

	/**
	 * 删除一个artist（与之关联的 track 的 artistId 会被设为 null）
	 * @param artistId - 要删除的artist的 ID。
	 * @returns ResultAsync 包含被删除的 ID 或一个错误。
	 */
	public deleteArtist(
		artistId: number,
	): ResultAsync<{ deletedId: number }, DatabaseError | ServiceError> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证artist是否存在
				const existing = await this.db.query.artists.findFirst({
					where: eq(schema.artists.id, artistId),
					columns: { id: true },
				})
				if (!existing) {
					throw createArtistNotFound(artistId)
				}

				const [deleted] = await this.db
					.delete(schema.artists)
					.where(eq(schema.artists.id, artistId))
					.returning({ deletedId: schema.artists.id })

				return deleted
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`删除artist ${artistId} 失败`, { cause: e }),
		)
	}

	/**
	 * 获取指定artist创作的所有歌曲。
	 * @param artistId - artist的 ID。
	 * @returns ResultAsync 包含一个 Track 数组或一个错误。
	 */
	public getArtistTracks(
		artistId: number,
	): ResultAsync<Track[], DatabaseError | ServiceError> {
		return ResultAsync.fromPromise(
			this.db.query.tracks.findMany({
				where: eq(schema.tracks.artistId, artistId),
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
					trackDownloads: true,
				},
			}),
			(e) =>
				new DatabaseError(`获取artist ${artistId} 的歌曲失败`, { cause: e }),
		).andThen((dbTracks) => {
			const formattedTracks: Track[] = []
			for (const dbTrack of dbTracks) {
				const formatted = this.trackService.formatTrack(dbTrack)
				if (!formatted) {
					return errAsync(
						new ServiceError(
							`格式化歌曲 ${dbTrack.id} 时发生错误，可能是原数据不存在或 source & metadata 不匹配`,
						),
					)
				}
				formattedTracks.push(formatted)
			}
			return okAsync(formattedTracks)
		})
	}

	/**
	 * 获取所有artist。
	 * @returns ResultAsync 包含所有 Artist 的数组或一个 DatabaseError。
	 */
	public getAllArtists(): ResultAsync<
		(typeof schema.artists.$inferSelect)[],
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.artists.findMany(),
			(e) => new DatabaseError('获取所有artist列表失败', { cause: e }),
		)
	}

	/**
	 * 根据 ID 获取单个artist的详细信息。
	 * @param artistId - artist的 ID。
	 * @returns ResultAsync 包含 Artist 或 undefined (如果未找到)，或一个 DatabaseError。
	 */
	public getArtistById(
		artistId: number,
	): ResultAsync<
		typeof schema.artists.$inferSelect | undefined,
		DatabaseError
	> {
		return ResultAsync.fromPromise(
			this.db.query.artists.findFirst({
				where: eq(schema.artists.id, artistId),
			}),
			(e) =>
				new DatabaseError(`通过 ID ${artistId} 获取artist失败`, { cause: e }),
		)
	}

	/**
	 * 批量查找或创建 remote artist。
	 * 接收一个 artist 数据数组，返回一个 remoteId -> artist 对象的映射。
	 *
	 * @param payloads - 一个包含多个 artist 创建信息的数组。
	 */
	public findOrCreateManyRemoteArtists(
		payloads: CreateArtistPayload[],
	): ResultAsync<
		Map<string, typeof schema.artists.$inferSelect>,
		ServiceError
	> {
		if (payloads.length === 0) {
			return okAsync(new Map<string, typeof schema.artists.$inferSelect>())
		}

		for (const p of payloads) {
			if (!p.source || !p.remoteId) {
				return errAsync(
					createValidationError(
						'payloads 中存在 source 或 remoteId 为空的对象，该方法仅用于处理 remote artist',
					),
				)
			}
		}

		return ResultAsync.fromPromise(
			(async () => {
				if (payloads.length > 0) {
					await this.db
						.insert(schema.artists)
						.values(
							payloads.map(
								(p) =>
									({
										name: p.name,
										source: p.source,
										remoteId: p.remoteId,
										avatarUrl: p.avatarUrl,
										signature: p.signature,
									}) satisfies CreateArtistPayload,
							),
						)
						.onConflictDoNothing()
				}

				const findConditions = payloads.map((p) =>
					and(
						eq(schema.artists.source, p.source),
						eq(schema.artists.remoteId, p.remoteId!),
					),
				)

				const allArtists = await this.db.query.artists.findMany({
					where: or(...findConditions),
				})

				const fullArtists = payloads.map((p) => {
					const existing = allArtists.find(
						(a) =>
							`${a.source}::${a.remoteId}` === `${p.source}::${p.remoteId}`,
					)
					if (existing) {
						return existing
					}
					throw new DatabaseError(
						`批量查找或创建 artists 后数据不一致，未找到 artist: ${p.source}::${p.remoteId}`,
					)
				})
				if (fullArtists.length !== payloads.length) {
					throw new DatabaseError(
						'创建或查找 artists 后数据不一致，部分 artist 未能成功写入或查询。',
					)
				}

				const finalResultMap = new Map(
					fullArtists.map((artist) => [artist.remoteId!, artist]),
				)

				return finalResultMap
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('批量查找或创建 artist 失败', { cause: e }),
		)
	}
}

export const artistService = new ArtistService(db, trackService)
