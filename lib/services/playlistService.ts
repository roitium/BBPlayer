import { DatabaseError } from '@/lib/core/errors'
import drizzleDb from '@/lib/db/db'
import { artists, playlists, playlistTracks, tracks } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'

export interface CreatePlaylistData {
	title: string
	description?: string
	coverUrl?: string
}

export interface UpdatePlaylistData {
	title?: string
	description?: string
	coverUrl?: string
}

export interface TrackData {
	bvid: string
	cid?: number
	title: string
	artistName?: string
	artistId?: number
	coverUrl?: string
	duration?: number
	isMultiPage: boolean
}

export interface TrackOrder {
	trackId: number
	order: number
}

export class PlaylistService {
	/**
	 * Create a new local playlist
	 */
	static async createPlaylist(
		data: CreatePlaylistData,
	): Promise<Result<typeof playlists.$inferSelect, DatabaseError>> {
		try {
			const result = await drizzleDb.transaction(async (tx) => {
				// Insert the playlist
				const [playlist] = await tx
					.insert(playlists)
					.values({
						title: data.title,
						description: data.description,
						coverUrl: data.coverUrl,
						type: 'local',
						itemCount: 0,
					})
					.returning()

				return playlist
			})

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to create playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Update an existing playlist
	 */
	static async updatePlaylist(
		id: number,
		data: UpdatePlaylistData,
	): Promise<Result<typeof playlists.$inferSelect, DatabaseError>> {
		try {
			const result = await drizzleDb.transaction(async (tx) => {
				// Check if playlist exists and is local
				const existingPlaylist = await tx
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, id), eq(playlists.type, 'local')))
					.limit(1)

				if (existingPlaylist.length === 0) {
					throw new Error('Local playlist not found')
				}

				// Update the playlist
				const [updatedPlaylist] = await tx
					.update(playlists)
					.set({
						title: data.title,
						description: data.description,
						coverUrl: data.coverUrl,
					})
					.where(eq(playlists.id, id))
					.returning()

				return updatedPlaylist
			})

			return ok(result)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to update playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Delete a playlist and all its track relationships
	 */
	static async deletePlaylist(
		id: number,
	): Promise<Result<void, DatabaseError>> {
		try {
			await drizzleDb.transaction(async (tx) => {
				// Check if playlist exists and is local
				const existingPlaylist = await tx
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, id), eq(playlists.type, 'local')))
					.limit(1)

				if (existingPlaylist.length === 0) {
					throw new Error('Local playlist not found')
				}

				// Delete playlist tracks (cascade will handle this, but being explicit)
				await tx.delete(playlistTracks).where(eq(playlistTracks.playlistId, id))

				// Delete the playlist
				await tx.delete(playlists).where(eq(playlists.id, id))
			})

			return ok(undefined)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to delete playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Add a track to a playlist
	 */
	static async addTrackToPlaylist(
		playlistId: number,
		trackData: TrackData,
	): Promise<Result<void, DatabaseError>> {
		try {
			await drizzleDb.transaction(async (tx) => {
				// Check if playlist exists and is local
				const playlist = await tx
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, playlistId), eq(playlists.type, 'local')))
					.limit(1)

				if (playlist.length === 0) {
					throw new Error('Local playlist not found')
				}

				// Validate track data based on isMultiPage
				if (trackData.isMultiPage && !trackData.cid) {
					throw new Error('cid is required for multi-page tracks')
				}

				// Create or get the track
				let trackId: number
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
					// For single-page tracks, check by bvid only
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
					trackId = existingTrack[0].id
				} else {
					// Create artist if provided and doesn't exist
					let artistId = trackData.artistId
					if (trackData.artistName && !artistId) {
						const existingArtist = await tx
							.select()
							.from(artists)
							.where(eq(artists.name, trackData.artistName))
							.limit(1)

						if (existingArtist.length > 0) {
							artistId = existingArtist[0].id
						} else {
							const [newArtist] = await tx
								.insert(artists)
								.values({
									name: trackData.artistName,
								})
								.returning()
							artistId = newArtist.id
						}
					}

					// Create the track
					const [newTrack] = await tx
						.insert(tracks)
						.values({
							bvid: trackData.bvid,
							cid: trackData.cid,
							title: trackData.title,
							artistId,
							coverUrl: trackData.coverUrl,
							duration: trackData.duration,
							isMultiPage: trackData.isMultiPage,
							source: 'bilibili',
						})
						.returning()
					trackId = newTrack.id
				}

				// Check if track is already in playlist
				const existingPlaylistTrack = await tx
					.select()
					.from(playlistTracks)
					.where(
						and(
							eq(playlistTracks.playlistId, playlistId),
							eq(playlistTracks.trackId, trackId),
						),
					)
					.limit(1)

				if (existingPlaylistTrack.length > 0) {
					throw new Error('Track already exists in playlist')
				}

				// Get the next order number
				const maxOrderResult = await tx
					.select({ maxOrder: sql<number>`MAX(${playlistTracks.order})` })
					.from(playlistTracks)
					.where(eq(playlistTracks.playlistId, playlistId))

				const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

				// Add track to playlist
				await tx.insert(playlistTracks).values({
					playlistId,
					trackId,
					order: nextOrder,
				})

				// Update playlist item count
				await tx
					.update(playlists)
					.set({
						itemCount: sql`${playlists.itemCount} + 1`,
					})
					.where(eq(playlists.id, playlistId))
			})

			return ok(undefined)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to add track to playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Remove a track from a playlist
	 */
	static async removeTrackFromPlaylist(
		playlistId: number,
		trackId: number,
	): Promise<Result<void, DatabaseError>> {
		try {
			await drizzleDb.transaction(async (tx) => {
				// Check if playlist exists and is local
				const playlist = await tx
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, playlistId), eq(playlists.type, 'local')))
					.limit(1)

				if (playlist.length === 0) {
					throw new Error('Local playlist not found')
				}

				// Check if track exists in playlist
				const playlistTrack = await tx
					.select()
					.from(playlistTracks)
					.where(
						and(
							eq(playlistTracks.playlistId, playlistId),
							eq(playlistTracks.trackId, trackId),
						),
					)
					.limit(1)

				if (playlistTrack.length === 0) {
					throw new Error('Track not found in playlist')
				}

				// Remove track from playlist
				await tx
					.delete(playlistTracks)
					.where(
						and(
							eq(playlistTracks.playlistId, playlistId),
							eq(playlistTracks.trackId, trackId),
						),
					)

				// Update playlist item count
				await tx
					.update(playlists)
					.set({
						itemCount: sql`${playlists.itemCount} - 1`,
					})
					.where(eq(playlists.id, playlistId))
			})

			return ok(undefined)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to remove track from playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}

	/**
	 * Reorder tracks in a playlist
	 */
	static async reorderPlaylistTracks(
		playlistId: number,
		trackOrders: TrackOrder[],
	): Promise<Result<void, DatabaseError>> {
		try {
			await drizzleDb.transaction(async (tx) => {
				// Check if playlist exists and is local
				const playlist = await tx
					.select()
					.from(playlists)
					.where(and(eq(playlists.id, playlistId), eq(playlists.type, 'local')))
					.limit(1)

				if (playlist.length === 0) {
					throw new Error('Local playlist not found')
				}

				// Update each track's order
				for (const { trackId, order } of trackOrders) {
					await tx
						.update(playlistTracks)
						.set({ order })
						.where(
							and(
								eq(playlistTracks.playlistId, playlistId),
								eq(playlistTracks.trackId, trackId),
							),
						)
				}
			})

			return ok(undefined)
		} catch (error) {
			return err(
				new DatabaseError(
					`Failed to reorder playlist tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
				),
			)
		}
	}
}
