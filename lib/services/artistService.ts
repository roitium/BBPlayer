import { and, eq, or } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import { Track } from '@/types/core/media'
import {
	CreateArtistPayload,
	UpdateArtistPayload,
} from '@/types/services/artist'
import db from '../db/db'
import * as schema from '../db/schema'
import {
	ArtistNotFoundError,
	DatabaseError,
	ServiceError,
	ValidationError,
} from '../errors/service'
import { TrackService, trackService } from './trackService'

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
			this.db.insert(schema.artists).values(payload).returning(),
			(e) => new DatabaseError('创建artist失败', e),
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
		DatabaseError | ValidationError
	> {
		const { source, remoteId } = payload
		if (!source || !remoteId) {
			return errAsync(
				new ValidationError('source 和 remoteId 在此方法中是必需的'),
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
					.values(payload)
					.returning()

				return newArtist
			})(),
			(e) => {
				if (e instanceof ValidationError) return e
				return new DatabaseError('查找或创建artist的事务失败', e)
			},
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
		DatabaseError | ArtistNotFoundError
	> {
		return ResultAsync.fromPromise(
			(async () => {
				// 首先验证artist是否存在
				const existing = await this.db.query.artists.findFirst({
					where: eq(schema.artists.id, artistId),
					columns: { id: true },
				})
				if (!existing) {
					throw new ArtistNotFoundError(artistId)
				}

				const [updated] = await this.db
					.update(schema.artists)
					.set(payload)
					.where(eq(schema.artists.id, artistId))
					.returning()

				return updated
			})(),
			(e) => {
				if (e instanceof ArtistNotFoundError) return e
				return new DatabaseError(`更新artist ${artistId} 失败`, e)
			},
		)
	}

	/**
	 * 删除一个artist（与之关联的 track 的 artistId 会被设为 null）
	 * @param artistId - 要删除的artist的 ID。
	 * @returns ResultAsync 包含被删除的 ID 或一个错误。
	 */
	public deleteArtist(
		artistId: number,
	): ResultAsync<{ deletedId: number }, DatabaseError | ArtistNotFoundError> {
		return ResultAsync.fromPromise(
			(async () => {
				// 验证artist是否存在
				const existing = await this.db.query.artists.findFirst({
					where: eq(schema.artists.id, artistId),
					columns: { id: true },
				})
				if (!existing) {
					throw new ArtistNotFoundError(artistId)
				}

				const [deleted] = await this.db
					.delete(schema.artists)
					.where(eq(schema.artists.id, artistId))
					.returning({ deletedId: schema.artists.id })

				return deleted
			})(),
			(e) => {
				if (e instanceof ArtistNotFoundError) return e
				return new DatabaseError(`删除artist ${artistId} 失败`, e)
			},
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
				},
			}),
			(e) => new DatabaseError(`获取artist ${artistId} 的歌曲失败`, e),
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
			(e) => new DatabaseError('获取所有artist列表失败', e),
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
			(e) => new DatabaseError(`通过 ID ${artistId} 获取artist失败`, e),
		)
	}

	/**
	 * 批量查找或创建 remote artist。
	 * 接收一个artist数据数组，返回一个从 remoteId 到完整artist对象的映射。
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
			return ResultAsync.fromSafePromise(Promise.resolve(new Map()))
		}

		return ResultAsync.fromPromise(
			(async () => {
				const findConditions = payloads.map((p) => {
					if (!p.source || !p.remoteId)
						throw new ValidationError(
							'payloads 中存在 source || remoteId 为空的 artist 对象，该方法只能创建 remote artist',
						)
					return and(
						eq(schema.artists.source, p.source),
						eq(schema.artists.remoteId, p.remoteId!),
					)
				})

				const existingArtists = await this.db.query.artists.findMany({
					where: or(...findConditions),
				})

				// 将已存在的artist放入一个 Map 中，用 "source:remoteId" 作为 key
				const existingArtistsMap = new Map<
					string,
					typeof schema.artists.$inferSelect
				>()
				for (const artist of existingArtists) {
					const compositeKey = `${artist.source}::${artist.remoteId}`
					existingArtistsMap.set(compositeKey, artist)
				}

				// 筛选出需要创建的新artist
				const artistsToCreate: CreateArtistPayload[] = []
				for (const payload of payloads) {
					const compositeKey = `${payload.source}::${payload.remoteId}`
					if (!existingArtistsMap.has(compositeKey)) {
						artistsToCreate.push(payload)
					}
				}

				let newlyCreatedArtists: (typeof schema.artists.$inferSelect)[] = []

				// 如果有需要创建的artist，则批量插入
				if (artistsToCreate.length > 0) {
					const _result = await ResultAsync.fromPromise(
						this.db.insert(schema.artists).values(artistsToCreate).returning(),
						(e) => new DatabaseError('批量创建 artist 失败', e),
					)
					if (_result.isErr()) {
						throw _result.error
					}
					newlyCreatedArtists = _result.value
				}

				// 合并结果并返回
				const finalResultMap = new Map<
					string,
					typeof schema.artists.$inferSelect
				>()

				// 添加已存在的
				for (const artist of existingArtists) {
					// 上面已经检查过 remoteId 了，所以这里直接断言
					finalResultMap.set(artist.remoteId!, artist)
				}

				// 添加新创建的
				for (const artist of newlyCreatedArtists) {
					finalResultMap.set(artist.remoteId!, artist)
				}

				return finalResultMap
			})(),
			(e) =>
				e instanceof DatabaseError
					? e
					: new ServiceError('批量查找或创建artist的事务失败', e),
		)
	}
}

export const artistService = new ArtistService(db, trackService)
