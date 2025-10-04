import { queryClient } from '@/lib/config/queryClient'
import { playlistService } from '@/lib/services/playlistService'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query'

queryClient.setQueryDefaults(['db', 'playlists'], {
	retry: false,
	staleTime: 0,
})

export const playlistKeys = {
	all: ['db', 'playlists'] as const,
	playlistLists: () => [...playlistKeys.all, 'playlistLists'] as const,
	playlistContents: (playlistId: number) =>
		[...playlistKeys.all, 'playlistContents', playlistId] as const,
	playlistMetadata: (playlistId: number) =>
		[...playlistKeys.all, 'playlistMetadata', playlistId] as const,
	playlistsContainingTrack: (id: number | string | undefined) =>
		[...playlistKeys.all, 'playlistsContainingTrack', id] as const,
	searchTracksInPlaylist: (playlistId: number, query: string) =>
		[...playlistKeys.all, 'searchTracksInPlaylist', playlistId, query] as const,
}

export const usePlaylistLists = () => {
	return useQuery({
		queryKey: playlistKeys.playlistLists(),
		queryFn: () => returnOrThrowAsync(playlistService.getAllPlaylists()),
	})
}

export const usePlaylistContents = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistContents(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistTracks(playlistId)),
	})
}

export const usePlaylistMetadata = (playlistId: number) => {
	return useQuery({
		queryKey: playlistKeys.playlistMetadata(playlistId),
		queryFn: () =>
			returnOrThrowAsync(playlistService.getPlaylistMetadata(playlistId)),
	})
}

export const usePlaylistsContainingTrack = (uniqueKey: string | undefined) => {
	return useQuery({
		queryKey: ['playlistsContainingTrack', 'byUniqueKey', uniqueKey],
		queryFn:
			uniqueKey !== undefined
				? () =>
						returnOrThrowAsync(
							playlistService.getLocalPlaylistsContainingTrackByUniqueKey(
								uniqueKey,
							),
						)
				: skipToken,
		enabled: uniqueKey !== undefined,
	})
}

export const useSearchTracksInPlaylist = (
	playlistId: number,
	query: string,
	startSearch: boolean,
) => {
	return useQuery({
		queryKey: playlistKeys.searchTracksInPlaylist(playlistId, query),
		queryFn: () =>
			returnOrThrowAsync(
				playlistService.searchTrackInPlaylist(playlistId, query),
			),
		enabled: !!query.trim() && startSearch,
		placeholderData: keepPreviousData,
	})
}
