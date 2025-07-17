import { and, eq } from 'drizzle-orm'
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import type { BilibiliTrack, LocalTrack, Track } from '../../types/core/media'
import { bilibiliApi } from '../api/bilibili/api'
import { BilibiliApiError } from '../api/bilibili/errors'
import * as schema from '../db/schema'
import {
	DatabaseError,
	TrackNotFoundError,
	ValidationError,
} from './trackServiceErrors'

interface ArtistPayload {
	name: string
	source: 'bilibili' | 'local'
	remoteId?: string
	avatarUrl?: string
	signature?: string
}

interface BilibiliMetadataPayload {
	bvid: string
	isMultiPart: boolean
	cid?: number
}

interface LocalMetadataPayload {
	localPath: string
}

export interface CreateTrackPayload {
	title: string
	source: 'bilibili' | 'local'
	artist?: ArtistPayload
	coverUrl?: string
	duration?: number
	bilibiliMetadata?: BilibiliMetadataPayload
	localMetadata?: LocalMetadataPayload
}

export interface UpdateTrackPayload {
	id: number
	title?: string
	source?: 'bilibili' | 'local'
	artist?: ArtistPayload
	coverUrl?: string
	duration?: number
	bilibiliMetadata?: BilibiliMetadataPayload
	localMetadata?: LocalMetadataPayload
}

export class TrackService {
	private readonly db: BetterSQLite3Database<typeof schema>

	constructor(db: BetterSQLite3Database<typeof schema>) {
		this.db = db
	}

	private _formatTrack(
		dbTrack:
			| (typeof schema.tracks.$inferSelect & {
					artist: typeof schema.artists.$inferSelect | null
					bilibiliMetadata: typeof schema.bilibiliMetadata.$inferSelect | null
					localMetadata: typeof schema.localMetadata.$inferSelect | null
			  })
			| undefined
			| null,
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
			createdAt: dbTrack.createdAt,
			source: dbTrack.source as 'bilibili' | 'local',
		}

		if (dbTrack.source === 'bilibili' && dbTrack.bilibiliMetadata) {
			return {
				...baseTrack,
				createdAt: dbTrack.createdAt.getTime(),
				source: 'bilibili',
				bilibiliMetadata: dbTrack.bilibiliMetadata,
			} as BilibiliTrack
		}

		if (dbTrack.source === 'local' && dbTrack.localMetadata) {
			return {
				...baseTrack,
				createdAt: dbTrack.createdAt.getTime(),
				source: 'local',
				localMetadata: dbTrack.localMetadata,
			} as LocalTrack
		}

		console.warn(
			`Track with id ${dbTrack.id} has inconsistent source and metadata.`,
		)
		return null
	}

	/**
	 * 创建一个新的音轨。
	 * @param payload - 创建音轨所需的数据。
	 * @returns ResultAsync 包含成功创建的 Track 或一个错误。
	 */
	public createTrack(
		payload: CreateTrackPayload,
	): ResultAsync<Track, ValidationError | DatabaseError | TrackNotFoundError> {
		// 1. 验证 payload
		if (payload.source === 'bilibili' && !payload.bilibiliMetadata) {
			return errAsync(
				new ValidationError('Bilibili source tracks require bilibiliMetadata.'),
			)
		}
		if (payload.source === 'local' && !payload.localMetadata) {
			return errAsync(
				new ValidationError('Local source tracks require localMetadata.'),
			)
		}

		// 2. 执行事务
		const transactionResult = ResultAsync.fromPromise(
			this.db.transaction(async (tx) => {
				// 处理 Artist
				let artistId: number | null = null
				if (payload.artist) {
					const { source, remoteId, name } = payload.artist
					let existingArtist: { id: number } | undefined
					// 这样的判断方式有点不太健全，但够用了
					if (source === 'bilibili' && remoteId) {
						existingArtist = await tx.query.artists.findFirst({
							columns: { id: true },
							where: and(
								eq(schema.artists.source, source),
								eq(schema.artists.remoteId, remoteId),
							),
						})
					} else if (source === 'local') {
						existingArtist = await tx.query.artists.findFirst({
							columns: { id: true },
							where: and(
								eq(schema.artists.source, source),
								eq(schema.artists.name, name),
							),
						})
					}

					if (existingArtist) {
						artistId = existingArtist.id
					} else {
						const [newArtist] = await tx
							.insert(schema.artists)
							.values(payload.artist)
							.returning({ id: schema.artists.id })
						artistId = newArtist.id
					}
				}

				// 创建音轨
				const [newTrack] = await tx
					.insert(schema.tracks)
					.values({
						title: payload.title,
						source: payload.source,
						artistId: artistId,
						coverUrl: payload.coverUrl,
						duration: payload.duration,
					})
					.returning({ id: schema.tracks.id })

				const trackId = newTrack.id

				// 创建元数据
				if (payload.source === 'bilibili') {
					await tx
						.insert(schema.bilibiliMetadata)
						.values({ trackId, ...payload.bilibiliMetadata! })
				} else if (payload.source === 'local') {
					await tx
						.insert(schema.localMetadata)
						.values({ trackId, ...payload.localMetadata! })
				}

				return trackId
			}),
			(e) => new DatabaseError('Transaction failed during track creation.', e),
		)

		// 3. 链式操作：获取并返回创建的音轨
		return transactionResult.andThen((newTrackId) =>
			this.getTrackById(newTrackId),
		)
	}

	/**
	 * 更新一个现有的音轨。
	 * @param payload - 更新音轨所需的数据。
	 * @returns ResultAsync 包含更新后的 Track 或一个错误。
	 */
	public updateTrack(
		payload: UpdateTrackPayload,
	): ResultAsync<Track, TrackNotFoundError | DatabaseError> {
		const { id, ...dataToUpdate } = payload

		const trackUpdateData: Partial<typeof schema.tracks.$inferInsert> = {}
		if (dataToUpdate.title !== undefined)
			trackUpdateData.title = dataToUpdate.title
		if (dataToUpdate.coverUrl !== undefined)
			trackUpdateData.coverUrl = dataToUpdate.coverUrl
		if (dataToUpdate.duration !== undefined)
			trackUpdateData.duration = dataToUpdate.duration

		if (Object.keys(trackUpdateData).length === 0) {
			// 如果没有提供任何要更新的数据，直接返回当前的 track
			return this.getTrackById(id)
		}

		const updateResult = ResultAsync.fromPromise(
			this.db
				.update(schema.tracks)
				.set(trackUpdateData)
				.where(eq(schema.tracks.id, id)),
			(e) => new DatabaseError(`Failed to update track with ID ${id}.`, e),
		)

		return updateResult.andThen(() => this.getTrackById(id))
	}

	/**
	 * 通过 ID 获取单个音轨的完整信息。
	 * @param id - 音轨的数据库 ID。
	 * @returns ResultAsync 包含 Track 或一个 TrackNotFoundError。
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
			(e) => new DatabaseError(`Database query failed for track ID ${id}.`, e),
		).andThen((dbTrack) => {
			const formattedTrack = this._formatTrack(dbTrack)
			if (!formattedTrack) {
				return errAsync(new TrackNotFoundError(id))
			}
			return okAsync(formattedTrack)
		})
	}

	/**
	 * 删除一个音轨。
	 * @param id - 要删除的音轨的 ID。
	 * @returns ResultAsync 包含被删除音轨的 ID 或一个 TrackNotFoundError。
	 */
	public deleteTrack(
		id: number,
	): ResultAsync<{ deletedId: number }, TrackNotFoundError | DatabaseError> {
		return ResultAsync.fromPromise(
			this.db
				.delete(schema.tracks)
				.where(eq(schema.tracks.id, id))
				.returning({ deletedId: schema.tracks.id }),
			(e) => new DatabaseError(`Failed to delete track with ID ${id}.`, e),
		).andThen((results) => {
			const result = results[0]
			if (!result) {
				return errAsync(new TrackNotFoundError(id))
			}
			return okAsync(result)
		})
	}

	/**
	 * 为音轨增加一次播放记录。
	 * @param trackId - 音轨的 ID。
	 * @returns ResultAsync 包含 true 或一个错误。
	 */
	public addPlayRecord(
		trackId: number,
	): ResultAsync<true, TrackNotFoundError | DatabaseError> {
		// 首先获取现有数据
		return ResultAsync.fromPromise(
			this.db.query.tracks.findFirst({
				where: eq(schema.tracks.id, trackId),
				columns: { playCountSequence: true },
			}),
			(e) =>
				new DatabaseError(
					`Failed to find track ${trackId} for play record.`,
					e,
				),
		)
			.andThen((track) => {
				if (!track) {
					return errAsync(new TrackNotFoundError(trackId))
				}

				const sequence = track.playCountSequence || []
				sequence.push(Date.now())

				// 然后更新
				return ResultAsync.fromPromise(
					this.db
						.update(schema.tracks)
						.set({ playCountSequence: sequence })
						.where(eq(schema.tracks.id, trackId)),
					(e) =>
						new DatabaseError(
							`Failed to update play record for track ${trackId}.`,
							e,
						),
				)
			})
			.map(() => true) // 如果更新成功，映射为 true
	}

	/**
	 * 根据 Bilibili 的唯一标识符获取音轨。
	 * @param identifiers - 包含 bvid 和可选的 cid。
	 * @returns ResultAsync 包含找到的 Track 或 TrackNotFoundError。
	 */
	public getTrackByBilibiliId(identifiers: {
		bvid: string
		cid?: number
	}): ResultAsync<Track, TrackNotFoundError | DatabaseError> {
		const { bvid, cid } = identifiers

		return ResultAsync.fromPromise(
			this.db.query.bilibiliMetadata.findFirst({
				where: (metadata, { and, eq, isNull }) =>
					and(
						eq(metadata.bvid, bvid),
						cid !== undefined ? eq(metadata.cid, cid) : isNull(metadata.cid),
					),
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
			(e) => new DatabaseError('Failed to query track by Bilibili ID.', e),
		).andThen((metadata) => {
			const identifierString = cid ? `${bvid}/${cid}` : bvid
			if (!metadata || !metadata.track) {
				return errAsync(
					new TrackNotFoundError(`identifier=${identifierString}`),
				)
			}

			const formattedTrack = this._formatTrack(metadata.track)
			if (!formattedTrack) {
				return errAsync(
					new DatabaseError(
						`Inconsistent track data for identifier=${identifierString}.`,
					),
				)
			}

			return okAsync(formattedTrack)
		})
	}

	/**
	 * 查找音轨，如果不存在则根据提供的 payload 创建一个新的。
	 * 唯一性检查基于源的特定标识符（如 bvid/cid 或 localPath）。
	 * @param payload - 创建音轨所需的数据。
	 * @returns ResultAsync 包含找到的或新创建的 Track。
	 */
	public findOrCreateTrack(
		payload: CreateTrackPayload,
	): ResultAsync<Track, ValidationError | DatabaseError | TrackNotFoundError> {
		let findTrackResult: ResultAsync<Track, TrackNotFoundError | DatabaseError>

		if (payload.source === 'bilibili' && payload.bilibiliMetadata) {
			findTrackResult = this.getTrackByBilibiliId({
				bvid: payload.bilibiliMetadata.bvid,
				cid: payload.bilibiliMetadata.cid,
			})
		} else if (payload.source === 'local' && payload.localMetadata) {
			return errAsync(
				new ValidationError('Local findOrCreate not yet implemented.'),
			)
		} else {
			return errAsync(
				new ValidationError(
					'Payload is missing unique identifiers for findOrCreate.',
				),
			)
		}

		return findTrackResult.orElse((error) => {
			if (error instanceof TrackNotFoundError) {
				return this.createTrack(payload)
			}

			return errAsync(error)
		})
	}

	public addTrackFromBilibiliApi(
		bvid: string,
		cid?: number,
	): ResultAsync<
		Track,
		TrackNotFoundError | DatabaseError | BilibiliApiError | ValidationError
	> {
		const apiData = bilibiliApi.getVideoDetails(bvid)
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
			return this.findOrCreateTrack(trackPayload)
		})
	}
}
