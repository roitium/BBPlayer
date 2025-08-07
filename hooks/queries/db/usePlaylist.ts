import { playlistService } from '@/lib/services/playlistService'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import { useQuery } from '@tanstack/react-query'

export const playlistKeys = {
	all: ['db', 'playlists'] as const,
	playlistLists: () => [...playlistKeys.all, 'playlistLists'] as const,
	playlistContents: (playlistId: number) =>
		[...playlistKeys.all, 'playlistContents', playlistId] as const,
	playlistMetadata: (playlistId: number) =>
		[...playlistKeys.all, 'playlistMetadata', playlistId] as const,
	playlistsContainingTrack: (trackId: number) =>
		[...playlistKeys.all, 'playlistsContainingTrack', trackId] as const,
}

export const usePlaylistLists = () => {
	return useQuery({
		queryKey: playlistKeys.playlistLists(),
		queryFn: () => returnOrThrowAsync(playlistService.getAllPlaylists()),
		staleTime: 0,
	})
}

export const usePlaylistContents = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistContents(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistTracks(playlistId)),
		staleTime: 0,
	})
}

export const usePlaylistMetadata = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistMetadata(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistMetadata(playlistId)),
		staleTime: 0,
	})
}

export const usePlaylistsContainingTrack = (trackId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistsContainingTrack(trackId),
		queryFn: () =>
			returnOrThrowAsync(
				playlistService.getLocalPlaylistsContainingTrack(trackId),
			),
		enabled: !!trackId,
	})
}
