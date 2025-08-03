import {
	BilibiliMetadataPayload,
	CreateBilibiliTrackPayload,
	CreateTrackPayload,
	UpdateTrackPayload,
} from '@/types/services/track'
import log from '@/utils/log'
import { and, eq, inArray } from 'drizzle-orm'
import { type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { Result, ResultAsync, err, errAsync, okAsync } from 'neverthrow'
import type { BilibiliTrack, LocalTrack, Track } from '../../types/core/media'
import {
	DatabaseError,
	NotImplementedError,
	TrackNotFoundError,
	ValidationError,
} from '../core/errors/service'
import db from '../db/db'
import * as schema from '../db/schema'
import generateUniqueTrackKey from './genKey'

const logger = log.extend('Service/Track')
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DBLike = ExpoSQLiteDatabase<typeof schema> | Tx
type SelectTrackWithMetadata = typeof schema.tracks.$inferSelect & {
	artist: typeof schema.artists.$inferSelect | null
	bilibiliMetadata: typeof schema.bilibiliMetadata.$inferSelect | null
	localMetadata: typeof schema.localMetadata.$inferSelect | null
}

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
			title: dbTrack.title,
			artist: dbTrack.artist,
			coverUrl: dbTrack.coverUrl,
			duration: dbTrack.duration,
			playCountSequence: dbTrack.playCountSequence || [],
			createdAt: dbTrack.createdAt.getTime(),
			source: dbTrack.source as 'bilibili' | 'local',
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

		logger.warn(`track ${dbTrack.id} 存在不一致的 source 和 metadata。`)
		return null
	}

	/**
	 * 创建一个新的 track
	 * @param payload - 创建 track 所需的数据。
	 * @returns ResultAsync 包含成功创建的 Track 或一个错误。
	 */
	private _createTrack(
		payload: CreateTrackPayload,
	): ResultAsync<Track, ValidationError | DatabaseError | TrackNotFoundError> {
		// validate
		if (payload.source === 'bilibili' && !payload.bilibiliMetadata) {
			return errAsync(
				new ValidationError(
					'当 source 为 bilibili 时，bilibiliMetadata 不能为空。',
				),
			)
		}
		if (payload.source === 'local' && !payload.localMetadata) {
			return errAsync(
				new ValidationError('当 source 为 local 时，localMetadata 不能为空。'),
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
						playCountSequence: [],
						createdAt: new Date(),
						uniqueKey: uniqueKey.value,
					})
					.returning({ id: schema.tracks.id })

				const trackId = newTrack.id

				// 创建元数据
				if (payload.source === 'bilibili') {
					await this.db
						.insert(schema.bilibiliMetadata)
						.values({ trackId, ...payload.bilibiliMetadata! })
				} else if (payload.source === 'local') {
					await this.db
						.insert(schema.localMetadata)
						.values({ trackId, ...payload.localMetadata! })
				}

				return trackId
			})(),
			(e) => new DatabaseError('创建 track 事务失败', e),
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
	): ResultAsync<Track, TrackNotFoundError | DatabaseError> {
		const { id, ...dataToUpdate } = payload

		const updateResult = ResultAsync.fromPromise(
			this.db
				.update(schema.tracks)
				.set(dataToUpdate)
				.where(eq(schema.tracks.id, id)),
			(e) => new DatabaseError(`更新 track 失败：${id}`, e),
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
	): ResultAsync<Track, TrackNotFoundError | DatabaseError> {
		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: eq(schema.tracks.id, id),
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) => new DatabaseError(`查找 track 失败：${id}`, e),
		).andThen((dbTrack) => {
			const result = this.formatTrack(dbTrack)
			if (!result) {
				return errAsync(new TrackNotFoundError(id))
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
	): ResultAsync<{ deletedId: number }, TrackNotFoundError | DatabaseError> {
		return ResultAsync.fromPromise(
			this.db
				.delete(schema.tracks)
				.where(eq(schema.tracks.id, id))
				.returning({ deletedId: schema.tracks.id }),
			(e) => new DatabaseError(`删除 track 失败：${id}`, e),
		).andThen((results) => {
			const result = results[0]
			if (!result) {
				return errAsync(new TrackNotFoundError(id))
			}
			return okAsync(result)
		})
	}

	/**
	 * 为 track 增加一次播放记录。
	 * @param trackId -  track 的 ID。
	 * @returns ResultAsync 包含 true 或一个错误。
	 */
	public addPlayRecord(
		trackId: number,
	): ResultAsync<boolean, TrackNotFoundError | DatabaseError> {
		return ResultAsync.fromPromise(
			(async () => {
				const track = await this.db.query.tracks.findFirst({
					where: eq(schema.tracks.id, trackId),
					columns: { playCountSequence: true },
				})

				if (!track) {
					throw new TrackNotFoundError(trackId)
				}

				const sequence = track.playCountSequence || []
				sequence.push(Date.now())

				await this.db
					.update(schema.tracks)
					.set({ playCountSequence: sequence })
					.where(eq(schema.tracks.id, trackId))

				return true
			})(),
			(e) =>
				e instanceof TrackNotFoundError
					? e
					: new DatabaseError(`增加播放记录的事务失败：${trackId}`, e),
		)
	}

	/**
	 * 根据 Bilibili 的元数据获取 track 。
	 * @param bilibiliMeatadata
	 * @returns
	 */
	public getTrackByBilibiliMetadata(
		bilibiliMetadata: BilibiliMetadataPayload,
	): ResultAsync<Track, TrackNotFoundError | DatabaseError | ValidationError> {
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
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) => new DatabaseError('根据 Bilibili 元数据查找 track 失败', e),
		).andThen((track) => {
			if (!track) {
				return errAsync(new TrackNotFoundError(`uniqueKey=${identifier.value}`))
			}

			const formattedTrack = this.formatTrack(track)
			if (!formattedTrack) {
				return errAsync(
					new ValidationError(
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
	): ResultAsync<Track, ValidationError | DatabaseError> {
		const uniqueKeyResult = generateUniqueTrackKey(payload)
		if (uniqueKeyResult.isErr()) {
			return errAsync(uniqueKeyResult.error)
		}
		const uniqueKey = uniqueKeyResult.value

		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: (track, { eq }) => eq(track.uniqueKey, uniqueKey),
				with: {
					artist: true,
					bilibiliMetadata: true,
					localMetadata: true,
				},
			}),
			(e) => new DatabaseError('根据 uniqueKey 查找 track 失败', e),
		)
			.andThen((dbTrack) => {
				if (dbTrack) {
					const formattedTrack = this.formatTrack(dbTrack)
					if (formattedTrack) {
						return okAsync(formattedTrack)
					}
					return errAsync(
						new ValidationError(
							`已存在的 track ${dbTrack.id} source 与 metadata 不匹配`,
						),
					)
				}
				return errAsync(new TrackNotFoundError(uniqueKey))
			})
			.orElse((error) => {
				if (error instanceof TrackNotFoundError) {
					return this._createTrack(payload)
				}
				return errAsync(error)
			})
	}

	/**
	 * 创建多个 tracks。
	 * @param tracksToCreate
	 * @param source
	 */
	private _createManyTracks(
		tracksToCreate: { uniqueKey: string; payload: CreateTrackPayload }[],
		source: Track['source'],
	): ResultAsync<number[], DatabaseError | NotImplementedError> {
		return ResultAsync.fromPromise(
			(async () => {
				const newTrackValues = tracksToCreate.map(({ uniqueKey, payload }) => ({
					...payload,
					uniqueKey,
					playCountSequence: [],
					createdAt: new Date(),
				}))

				const newlyCreatedTracks = await this.db
					.insert(schema.tracks)
					.values(newTrackValues)
					.returning({
						id: schema.tracks.id,
						uniqueKey: schema.tracks.uniqueKey,
					})

				const newlyCreatedTrackIds = newlyCreatedTracks.map((t) => t.id)
				const newlyCreatedTracksDict = Object.fromEntries(
					newlyCreatedTracks.map((t) => [t.uniqueKey, t.id]),
				)

				switch (source) {
					case 'bilibili': {
						const bilibiliMetadataValues = tracksToCreate.map(
							({ uniqueKey, payload }) => ({
								trackId: newlyCreatedTracksDict[uniqueKey],
								...(payload as CreateBilibiliTrackPayload).bilibiliMetadata,
							}),
						)

						if (bilibiliMetadataValues.length > 0) {
							await this.db
								.insert(schema.bilibiliMetadata)
								.values(bilibiliMetadataValues)
						}
						break
					}
					case 'local': {
						throw new NotImplementedError('处理 local source 的逻辑尚未实现')
					}
				}

				return newlyCreatedTrackIds
			})(),
			(e) =>
				e instanceof NotImplementedError
					? e
					: new DatabaseError('批量创建 tracks 失败', e),
		)
	}

	/**
	 * 批量查找或创建 tracks。目前为了简便起见，暂时只实现了创建来自同一个 source 的 tracks。
	 * 如果有需要创建的 track，则批量插入。
	 * @param payloads
	 * @param source
	 */
	public findOrCreateManyTracks(
		payloads: CreateTrackPayload[],
		source: Track['source'],
	): ResultAsync<
		number[],
		ValidationError | DatabaseError | NotImplementedError
	> {
		if (payloads.length === 0) {
			return okAsync([])
		}

		const processedPayloadsResult = Result.combine(
			payloads.map((p) => {
				if (p.source !== source)
					return err(new ValidationError('source 不一致'))
				return generateUniqueTrackKey(p).map((uniqueKey) => ({
					uniqueKey,
					payload: p,
				}))
			}),
		)

		// 如果预处理失败，直接返回错误
		if (processedPayloadsResult.isErr()) {
			return errAsync(processedPayloadsResult.error)
		}

		const processedPayloads = processedPayloadsResult.value
		const uniqueKeys = processedPayloads.map((p) => p.uniqueKey)

		return ResultAsync.fromPromise(
			this.db.query.tracks.findMany({
				where: and(
					eq(schema.tracks.source, source),
					inArray(schema.tracks.uniqueKey, uniqueKeys),
				),
				columns: {
					id: true,
					uniqueKey: true,
				},
			}),
			(e) => new DatabaseError('批量查找 tracks 失败', e),
		).andThen((existingTracks) => {
			const existingTrackIds = existingTracks.map((t) => t.id)
			const existingUniqueKeys = new Set(existingTracks.map((t) => t.uniqueKey))

			const tracksToCreate = processedPayloads.filter(
				(p) => !existingUniqueKeys.has(p.uniqueKey),
			)

			if (tracksToCreate.length === 0) {
				return okAsync(existingTrackIds)
			}

			return this._createManyTracks(tracksToCreate, source).map(
				(newlyCreatedTrackIds) => {
					return [...existingTrackIds, ...newlyCreatedTrackIds]
				},
			)
		})
	}
}

export const trackService = new TrackService(db)
