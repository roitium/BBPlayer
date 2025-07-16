import { DatabaseError } from '@/lib/core/errors'
import drizzleDb from '@/lib/db/db'
import { artists, tracks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'

export interface ArtistData {
	id?: number
	name: string
	avatarUrl?: string
	signature?: string
}

export interface CreateTrackData {
	bvid: string
	cid?: number
	title: string
	artistId?: number
	coverUrl?: string
	duration?: number
	isMultiPage: boolean
	source?: 'bilibili' | 'local'
}

export class TrackService {
	/**
	 * Create or update a track (upsert based on bvid and cid for multi-page, bvid only for single-page)
	 */
	static async createOrUpdateTrack(
		trackData: CreateTrackData,
	): Promise<Result<typeof tracks.$inferSelect, DatabaseError>> {
		try {
			// Validate track data based on isMultiPage
			if (trackData.isMultiPage && !trackData.cid) {
				return err(new DatabaseError('cid is required for multi-page tracks'))
			}

			const result = await drizzleDb.transaction(async (tx) => {
				// Check if track already exists based on isMultiPage
				let existingTrack

				if (trackData.isMultiPage) {
					// For multi-page tracks, check by both bvid and cid
					existingTrack = await tx
						.select()
						.from(tracks)
						.where(
							and(
								eq(tracks.bvid, trackData.bvid),
								eq(tracks.cid, trackData.cid!),
							),
						)
						.limit(1)
				} else {
					// For single-page tracks, check by bvid and isMultiPage = false
					existingTrack = await tx
						.select()
						.from(tracks)
						.where(
							and(
								eq(tracks.bvid, trackData.bvid),
								eq(tracks.isMultiPage, false),
							),
						)
						.limit(1)
				}

				if (existingTrack.length > 0) {
					// Update existing track
					const [updatedTrack] = await tx
						.update(tracks)
						.set({
							cid: trackData.cid,
							title: trackData.title,
							artistId: trackData.artistId,
							coverUrl: trackData.coverUrl,
							duration: trackData.duration,
							isMultiPage: trackData.isMultiPage,
							source: trackData.source ?? 'bilibili',
						})
						.where(eq(tracks.id, existingTrack[0].id))
						.returning()

					return updatedTrack
				} else {
					// Create new track
					const [newTrack] = await tx
						.insert(tracks)
						.values({
							bvid: trackData.bvid,
							cid: trackData.cid,
							title: trackData.title,
							artistId: trackData.artistId,
							coverUrl: trackData.coverUrl,
							duration: trackData.duration,
							isMultiPage: trackData.isMultiPage,
							source: trackData.source ?? 'bilibili',
						})
						.returning()

					return newTrack
				}
			})

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to create or update track: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Find a track by bvid and optional cid
	 * For single-page tracks, only bvid is needed
	 * For multi-page tracks, both bvid and cid are required
	 */
	static async findTrack(
		bvid: string,
		cid?: number,
	): Promise<Result<typeof tracks.$inferSelect | null, DatabaseError>> {
		try {
			let result

			if (cid !== undefined) {
				// Looking for a specific multi-page track
				result = await drizzleDb
					.select()
					.from(tracks)
					.where(and(eq(tracks.bvid, bvid), eq(tracks.cid, cid)))
					.limit(1)
			} else {
				// Looking for a single-page track
				result = await drizzleDb
					.select()
					.from(tracks)
					.where(and(eq(tracks.bvid, bvid), eq(tracks.isMultiPage, false)))
					.limit(1)
			}

			return ok(result.length > 0 ? result[0] : null)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to find track: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Find all tracks by bvid (useful for getting all parts of a multi-page video)
	 */
	static async findAllTracksByBvid(
		bvid: string,
	): Promise<Result<(typeof tracks.$inferSelect)[], DatabaseError>> {
		try {
			const result = await drizzleDb
				.select()
				.from(tracks)
				.where(eq(tracks.bvid, bvid))

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to find tracks by bvid: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Create an artist if it doesn't exist, or return existing one
	 */
	static async createArtistIfNotExists(
		artistData: ArtistData,
	): Promise<Result<typeof artists.$inferSelect, DatabaseError>> {
		try {
			const result = await drizzleDb.transaction(async (tx) => {
				// If ID is provided, try to find by ID first
				if (artistData.id) {
					const existingById = await tx
						.select()
						.from(artists)
						.where(eq(artists.id, artistData.id))
						.limit(1)

					if (existingById.length > 0) {
						return existingById[0]
					}
				}

				// Check if artist exists by name
				const existingByName = await tx
					.select()
					.from(artists)
					.where(eq(artists.name, artistData.name))
					.limit(1)

				if (existingByName.length > 0) {
					// Update existing artist with new data if provided
					const [updatedArtist] = await tx
						.update(artists)
						.set({
							avatarUrl: artistData.avatarUrl ?? existingByName[0].avatarUrl,
							signature: artistData.signature ?? existingByName[0].signature,
						})
						.where(eq(artists.id, existingByName[0].id))
						.returning()

					return updatedArtist
				} else {
					// Create new artist
					const [newArtist] = await tx
						.insert(artists)
						.values({
							id: artistData.id,
							name: artistData.name,
							avatarUrl: artistData.avatarUrl,
							signature: artistData.signature,
						})
						.returning()

					return newArtist
				}
			})

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to create or find artist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Get track with artist information
	 */
	static async getTrackWithArtist(trackId: number): Promise<
		Result<
			typeof tracks.$inferSelect & {
				artist: typeof artists.$inferSelect | null
			},
			DatabaseError
		>
	> {
		try {
			const result = await drizzleDb.query.tracks.findFirst({
				where: eq(tracks.id, trackId),
				with: {
					artist: true,
				},
			})

			if (!result) {
				return err(new DatabaseError('Track not found'))
			}

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to get track with artist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Delete a track (only if it's not referenced by any playlists)
	 */
	static async deleteTrack(
		trackId: number,
	): Promise<Result<void, DatabaseError>> {
		try {
			await drizzleDb.transaction(async (tx) => {
				// Check if track exists
				const existingTrack = await tx
					.select()
					.from(tracks)
					.where(eq(tracks.id, trackId))
					.limit(1)

				if (existingTrack.length === 0) {
					throw new Error('Track not found')
				}

				// Note: If track is referenced by playlists, the foreign key constraint
				// will prevent deletion. This is intentional to maintain data integrity.
				await tx.delete(tracks).where(eq(tracks.id, trackId))
			})

			return ok(undefined)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to delete track: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}
}
