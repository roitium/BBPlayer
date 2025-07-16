import { DatabaseError } from '@/lib/core/errors'
import drizzleDb from '@/lib/db/db'
import { playlists } from '@/lib/db/schema'
import { Track } from '@/types/core/media'
import { useQuery } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'

export const playlistKeys = {
	all: ['db', 'playlists'] as const,
	playlistLists: () => [...playlistKeys.all, 'playlistLists'] as const,
	playlistContents: (playlistId: number) =>
		[...playlistKeys.all, 'playlistContents', playlistId] as const,
	playlistMetadata: (playlistId: number) =>
		[...playlistKeys.all, 'playlistMetadata', playlistId] as const,
}

export const usePlaylistLists = () => {
	return useQuery({
		queryKey: playlistKeys.playlistLists(),
		queryFn: () => {
			return drizzleDb.select().from(playlists).all()
		},
		staleTime: 0,
	})
}

export const usePlaylistContents = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistContents(playlistId),
		queryFn: async () => {
			const playlist = await drizzleDb.query.playlists.findFirst({
				where: eq(playlists.id, playlistId),
				with: {
					trackLinks: {
						with: {
							track: true,
						},
					},
				},
			})
			if (!playlist) {
				throw new DatabaseError('Playlist not found')
			}
			return playlist?.trackLinks.map((trackLink) => {
				return {
					...trackLink.track,
					id: trackLink.track.bvid,
					hasMetadata: true,
				} as Track
			})
		},
		staleTime: 0,
	})
}

export const usePlaylistMetadata = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistMetadata(playlistId),
		queryFn: async () => {
			const playlist = await drizzleDb.query.playlists.findFirst({
				where: eq(playlists.id, playlistId),
				with: {
					author: true,
				},
			})
			if (!playlist) {
				throw new DatabaseError('Playlist not found')
			}
			return {
				...playlist,
				count: playlist.itemCount,
				source: playlist.type === 'local' ? 'local' : 'bilibili',
			}
		},
		staleTime: 0,
	})
}
