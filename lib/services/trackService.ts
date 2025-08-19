import type {
	BilibiliMetadataPayload,
	CreateBilibiliTrackPayload,
	CreateTrackPayload,
	CreateTrackPayloadBase,
	UpdateTrackPayload,
	UpdateTrackPayloadBase,
} from '@/types/services/track'
import log from '@/utils/log'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { Result, ResultAsync, err, errAsync, okAsync } from 'neverthrow'
import type {
	BilibiliTrack,
	LocalTrack,
	PlayRecord,
	Track,
} from '../../types/core/media'
import db from '../db/db'
import * as schema from '../db/schema'
import {
	DatabaseError,
	ServiceError,
	createNotImplementedError,
	createTrackNotFound,
	createValidationError,
} from '../errors/service'
import generateUniqueTrackKey from './genKey'

const logger = log.extend('Service.Track')
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DBLike = ExpoSQLiteDatabase<typeof schema> | Tx
type SelectTrackBaseFull = typeof schema.tracks.$inferSelect
type SelectTrackBaseSlim = Omit<
	typeof schema.tracks.$inferSelect,
	'playHistory'
>
type SelectTrackWithMetadata =
	| (SelectTrackBaseFull & {
			artist: typeof schema.artists.$inferSelect | null
			bilibiliMetadata: typeof schema.bilibiliMetadata.$inferSelect | null
			localMetadata: typeof schema.localMetadata.$inferSelect | null
	  })
	| (SelectTrackBaseSlim & {
			artist: typeof schema.artists.$inferSelect | null
			bilibiliMetadata: typeof schema.bilibiliMetadata.$inferSelect | null
			localMetadata: typeof schema.localMetadata.$inferSelect | null
	  })

export class TrackService {
	constructor(private readonly db: DBLike) {}

	/**
	 * 返回一个使用新数据库连接（例如事务）的新实例。
	 * @param conn - 新的数据库连接或事务。
	 * @returns 一个新的实例。
	 */
	withDB(conn: DBLike) {
		return new TrackService(conn)
	}

	/**
	 * 基本上是为了让 Typescript 开心
	 * @param dbTrack
	 * @returns
	 */
	public formatTrack(
		dbTrack: SelectTrackWithMetadata | undefined | null,
	): Track | null {
		if (!dbTrack) {
			return null
		}

		const baseTrack = {
			id: dbTrack.id,
			uniqueKey: dbTrack.uniqueKey,
			title: dbTrack.title,
			artist: dbTrack.artist,
			coverUrl: dbTrack.coverUrl,
			duration: dbTrack.duration,
			createdAt: dbTrack.createdAt,
			source: dbTrack.source,
			updatedAt: dbTrack.updatedAt,
		}

		if (dbTrack.source === 'bilibili' && dbTrack.bilibiliMetadata) {
			return {
				...baseTrack,
				bilibiliMetadata: dbTrack.bilibiliMetadata,
			} as BilibiliTrack
		}

		if (dbTrack.source === 'local' && dbTrack.localMetadata) {
			return {
				...baseTrack,
				localMetadata: dbTrack.localMetadata,
			} as LocalTrack
		}

		logger.warning(`track ${dbTrack.id} 存在不一致的 source 和 metadata。`)
		return null
	}

	/**
	 * 创建一个新的 track
	 * @param payload - 创建 track 所需的数据。
	 * @returns ResultAsync 包含成功创建的 Track 或一个错误。
	 */
	private _createTrack(
		payload: CreateTrackPayload,
	): ResultAsync<Track, ServiceError | DatabaseError> {
		// validate
		if (payload.source === 'bilibili' && !payload.bilibiliMetadata) {
			return errAsync(
				createValidationError(
					'当 source 为 bilibili 时，bilibiliMetadata 不能为空。',
				),
			)
		}
		if (payload.source === 'local' && !payload.localMetadata) {
			return errAsync(
				createValidationError(
					'当 source 为 local 时，localMetadata 不能为空。',
				),
			)
		}

		const uniqueKey = generateUniqueTrackKey(payload)
		if (uniqueKey.isErr()) {
			return errAsync(uniqueKey.error)
		}

		const transactionResult = ResultAsync.fromPromise(
			(async () => {
				// 创建 track
				const [newTrack] = await this.db
					.insert(schema.tracks)
					.values({
						title: payload.title,
						source: payload.source,
						artistId: payload.artistId,
						coverUrl: payload.coverUrl,
						duration: payload.duration,
						uniqueKey: uniqueKey.value,
					})
					.returning({ id: schema.tracks.id })

				const trackId = newTrack.id

				// 创建元数据
				if (payload.source === 'bilibili') {
					await this.db.insert(schema.bilibiliMetadata).values({
						trackId,
						bvid: payload.bilibiliMetadata.bvid,
						cid: payload.bilibiliMetadata.cid,
						isMultiPage: payload.bilibiliMetadata.isMultiPage,
						mainTrackTitle: payload.bilibiliMetadata.mainTrackTitle,
						videoIsValid: payload.bilibiliMetadata.videoIsValid,
					} satisfies BilibiliMetadataPayload & { trackId: number })
				} else if (payload.source === 'local') {
					await this.db.insert(schema.localMetadata).values({
						trackId,
						localPath: payload.localMetadata.localPath,
					})
				}

				return trackId
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('创建 track 事务失败', { cause: e }),
		)

		return transactionResult.andThen((newTrackId) =>
			this.getTrackById(newTrackId),
		)
	}

	/**
	 * 更新一个现有的 track 。
	 * @param payload - 更新 track 所需的数据。
	 * @returns ResultAsync 包含更新后的 Track 或一个错误。
	 */
	public updateTrack(
		payload: UpdateTrackPayload,
	): ResultAsync<Track, ServiceError | DatabaseError> {
		const { id, ...dataToUpdate } = payload

		const updateResult = ResultAsync.fromPromise(
			this.db
				.update(schema.tracks)
				.set({
					title: dataToUpdate.title ?? undefined,
					artistId: dataToUpdate.artistId,
					coverUrl: dataToUpdate.coverUrl,
					duration: dataToUpdate.duration,
				} satisfies Omit<UpdateTrackPayloadBase, 'id'>)
				.where(eq(schema.tracks.id, id)),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`更新 track 失败：${id}`, { cause: e }),
		)

		return updateResult.andThen(() => this.getTrackById(id))
	}

	/**
	 * 通过 ID 获取单个 track 的完整信息。
	 * @param id -  track 的数据库 ID。
	 * @returns ResultAsync
	 */
	public getTrackById(
		id: number,
	): ResultAsync<Track, ServiceError | DatabaseError> {
		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: eq(schema.tracks.id, id),
				columns: { playHistory: false },
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`查找 track 失败：${id}`, { cause: e }),
		).andThen((dbTrack) => {
			const result = this.formatTrack(dbTrack)
			if (!result) {
				return errAsync(createTrackNotFound(id))
			}
			return okAsync(result)
		})
	}

	/**
	 * 删除一个 track。
	 * @param id - 要删除的 track 的 ID。
	 * @returns ResultAsync
	 */
	public deleteTrack(
		id: number,
	): ResultAsync<{ deletedId: number }, ServiceError | DatabaseError> {
		return ResultAsync.fromPromise(
			this.db
				.delete(schema.tracks)
				.where(eq(schema.tracks.id, id))
				.returning({ deletedId: schema.tracks.id }),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`删除 track 失败：${id}`, { cause: e }),
		).andThen((results) => {
			const result = results[0]
			if (!result) {
				return errAsync(createTrackNotFound(id))
			}
			return okAsync(result)
		})
	}

	/**
	 * 为 track 增加一次播放记录。
	 * @param trackId -  track 的 ID。
	 * @param record - 播放记录。
	 * @returns ResultAsync 包含 true 或一个错误。
	 */
	public addPlayRecordFromTrackId(
		trackId: number,
		record: PlayRecord,
	): ResultAsync<true, ServiceError | DatabaseError> {
		return ResultAsync.fromPromise(
			(async () => {
				const recordJson = JSON.stringify(record)

				await this.db
					.update(schema.tracks)
					.set({
						playHistory: sql`json_insert(
              play_history,
              '$[#]',
              json(${recordJson})
            )`,
					})
					.where(eq(schema.tracks.id, trackId))

				return true as const
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`增加播放记录失败：${trackId}`, { cause: e }),
		)
	}

	public addPlayRecordFromUniqueKey(
		uniqueKey: string,
		record: PlayRecord,
	): ResultAsync<true, ServiceError | DatabaseError> {
		return ResultAsync.fromPromise(
			(async () => {
				const track = await this.findTrackIdsByUniqueKeys([uniqueKey])
				if (track.isErr()) {
					throw track.error
				}
				const trackId = track.value.get(uniqueKey)
				if (!trackId) {
					throw createTrackNotFound(uniqueKey)
				}

				await this.addPlayRecordFromTrackId(trackId, record)

				return true as const
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError(`增加播放记录失败：${uniqueKey}`, { cause: e }),
		)
	}

	/**
	 * 根据 Bilibili 的元数据获取 track 。
	 * @param bilibiliMeatadata
	 * @returns
	 */
	public getTrackByBilibiliMetadata(
		bilibiliMetadata: BilibiliMetadataPayload,
	): ResultAsync<Track, ServiceError | DatabaseError> {
		const identifier = generateUniqueTrackKey({
			source: 'bilibili',
			bilibiliMetadata: bilibiliMetadata,
		})
		if (identifier.isErr()) {
			return errAsync(identifier.error)
		}
		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: (track, { eq }) => eq(track.uniqueKey, identifier.value),
				columns: { playHistory: false },
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('根据 Bilibili 元数据查找 track 失败', {
							cause: e,
						}),
		).andThen((track) => {
			if (!track) {
				return errAsync(createTrackNotFound(`uniqueKey=${identifier.value}`))
			}

			const formattedTrack = this.formatTrack(track)
			if (!formattedTrack) {
				return errAsync(
					createValidationError(
						`根据 Bilibili 元数据查找 track 失败：元数据不匹配。`,
					),
				)
			}

			return okAsync(formattedTrack)
		})
	}

	/**
	 * 查找 track ，如果不存在则根据提供的 payload 创建一个新的。
	 * 唯一性检查基于 generateUniqueTrackKey 生成的唯一标识符。
	 * @param payload - 创建 track 所需的数据。
	 * @returns ResultAsync
	 */
	public findOrCreateTrack(
		payload: CreateTrackPayload,
	): ResultAsync<Track, ServiceError | DatabaseError> {
		const uniqueKeyResult = generateUniqueTrackKey(payload)
		if (uniqueKeyResult.isErr()) {
			return errAsync(uniqueKeyResult.error)
		}
		const uniqueKey = uniqueKeyResult.value

		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: (track, { eq }) => eq(track.uniqueKey, uniqueKey),
				columns: { playHistory: false },
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('根据 uniqueKey 查找 track 失败', { cause: e }),
		)
			.andThen((dbTrack) => {
				if (dbTrack) {
					const formattedTrack = this.formatTrack(dbTrack)
					if (formattedTrack) {
						return okAsync(formattedTrack)
					}
					return errAsync(
						createValidationError(
							`已存在的 track ${dbTrack.id} source 与 metadata 不匹配`,
						),
					)
				}
				return errAsync(createTrackNotFound(uniqueKey))
			})
			.orElse((error) => {
				if (error instanceof ServiceError && error.type === 'TrackNotFound') {
					return this._createTrack(payload)
				}
				return errAsync(error)
			})
	}

	/**
	 * 批量查找或创建 tracks，并处理其关联的元数据。
	 *
	 * @param payloads - 要创建或查找的 track 数据。
	 * @param source - 所有 track 必须来自的同一个来源。
	 * @returns 如果操作成功，其中包含一个从 uniqueKey -> track ID 的映射。
	 */
	public findOrCreateManyTracks(
		payloads: CreateTrackPayload[],
		source: Track['source'],
	): ResultAsync<Map<string, number>, ServiceError | DatabaseError> {
		if (payloads.length === 0) {
			return okAsync(new Map<string, number>())
		}

		const processedPayloadsResult = Result.combine(
			payloads.map((p) => {
				if (p.source !== source)
					return err(createValidationError('source 不一致'))
				return generateUniqueTrackKey(p).map((uniqueKey) => ({
					uniqueKey,
					payload: p,
				}))
			}),
		)

		if (processedPayloadsResult.isErr()) {
			return errAsync(processedPayloadsResult.error)
		}

		const processedPayloads = processedPayloadsResult.value
		const uniqueKeys = processedPayloads.map((p) => p.uniqueKey)

		return ResultAsync.fromPromise(
			(async () => {
				const trackValuesToInsert = processedPayloads.map(
					({ uniqueKey, payload }) =>
						({
							title: payload.title,
							artistId: payload.artistId,
							coverUrl: payload.coverUrl,
							duration: payload.duration,
							uniqueKey: uniqueKey,
							source: payload.source,
						}) satisfies CreateTrackPayloadBase & {
							uniqueKey: string
							source: string
						},
				)

				if (trackValuesToInsert.length > 0) {
					await this.db
						.insert(schema.tracks)
						.values(trackValuesToInsert)
						.onConflictDoNothing()
				}

				const allTracks = await this.db.query.tracks.findMany({
					where: and(inArray(schema.tracks.uniqueKey, uniqueKeys)),
					columns: {
						id: true,
						uniqueKey: true,
					},
				})

				const finalUniqueKeyToIdMap = new Map(
					allTracks.map((t) => [t.uniqueKey, t.id]),
				)

				if (finalUniqueKeyToIdMap.size !== uniqueKeys.length) {
					throw new DatabaseError(
						'创建或查找 tracks 后数据不一致，部分 track 未能成功写入或查询。',
					)
				}

				switch (source) {
					case 'bilibili': {
						const bilibiliMetadataValues = processedPayloads.map(
							({ uniqueKey, payload }) => {
								const trackId = finalUniqueKeyToIdMap.get(uniqueKey)
								if (!trackId) {
									throw new ServiceError(
										`该错误不应该出现，无法为 ${uniqueKey} 找到 trackId`,
									)
								}
								return {
									trackId,
									...(payload as CreateBilibiliTrackPayload).bilibiliMetadata,
								}
							},
						)

						if (bilibiliMetadataValues.length > 0) {
							await this.db
								.insert(schema.bilibiliMetadata)
								.values(bilibiliMetadataValues)
								.onConflictDoNothing()
						}
						break
					}
					case 'local': {
						throw createNotImplementedError('处理 local source 的逻辑尚未实现')
					}
				}

				return finalUniqueKeyToIdMap
			})(),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('批量查找或创建 tracks 失败', { cause: e }),
		)
	}

	/**
	 * 根据 uniqueKey 批量查找 track 的 ID。
	 * @param uniqueKeys
	 * @returns 如果成功，即为找到的 track 的 uniqueKey -> id 映射
	 */
	public findTrackIdsByUniqueKeys(
		uniqueKeys: string[],
	): ResultAsync<Map<string, number>, DatabaseError> {
		if (uniqueKeys.length === 0) {
			return okAsync(new Map<string, number>())
		}
		return ResultAsync.fromPromise(
			this.db.query.tracks.findMany({
				where: and(inArray(schema.tracks.uniqueKey, uniqueKeys)),
				columns: {
					id: true,
					uniqueKey: true,
				},
			}),
			(e) =>
				e instanceof ServiceError
					? e
					: new DatabaseError('批量查找 tracks 失败', { cause: e }),
		).andThen((existingTracks) => {
			const uniqueKeyToIdMap = new Map<string, number>()
			for (const track of existingTracks) {
				uniqueKeyToIdMap.set(track.uniqueKey, track.id)
			}
			return okAsync(uniqueKeyToIdMap)
		})
	}

	/**
	 * 获取播放次数排行榜（按播放次数降序）。
	 * @param limit 返回的最大条目数，默认 50
	 * @param options.onlyCompleted 是否仅统计完整播放（completed=true），默认 false
	 */
	public getPlayCountLeaderboard(
		limit = 20,
		options?: { onlyCompleted?: boolean },
	): ResultAsync<
		{ track: Track; playCount: number }[],
		DatabaseError | ServiceError
	> {
		const onlyCompleted = options?.onlyCompleted ?? true
		return ResultAsync.fromPromise(
			this.db.query.tracks.findMany({
				columns: { playHistory: false },
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) => new DatabaseError('获取播放次数排行榜失败', { cause: e }),
		).andThen((rows) => {
			const ids = rows.map((r) => r.id)
			if (ids.length === 0)
				return okAsync([] as { track: Track; playCount: number }[])

			return ResultAsync.fromPromise(
				this.db
					.select({
						id: schema.tracks.id,
						playCount: onlyCompleted
							? sql<number>`(select count(*) from json_each(${schema.tracks.playHistory}) as je where json_extract(je.value, '$.completed') = 1)`
							: sql<number>`json_array_length(${schema.tracks.playHistory})`,
					})
					.from(schema.tracks)
					.where(inArray(schema.tracks.id, ids)),
				(e) => new DatabaseError('统计播放次数失败', { cause: e }),
			).andThen((counts) => {
				const countMap = new Map<number, number>(
					counts.map((c) => [c.id, c.playCount ?? 0]),
				)
				const items: { track: Track; playCount: number }[] = []
				for (const row of rows) {
					const track = this.formatTrack(row)
					if (!track) continue
					const count = countMap.get(track.id) ?? 0
					if (count > 0) items.push({ track, playCount: count })
				}
				items.sort((a, b) => {
					if (b.playCount !== a.playCount) return b.playCount - a.playCount
					return (
						new Date(b.track.updatedAt).getTime() -
						new Date(a.track.updatedAt).getTime()
					)
				})
				return okAsync(items.slice(0, Math.max(0, limit)))
			})
		})
	}
}

export const trackService = new TrackService(db)
