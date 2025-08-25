import lyricService from '@/lib/services/lyricService'
import type { Track } from '@/types/core/media'
import { useQuery } from '@tanstack/react-query'

export const lyricsQueryKeys = {
	all: ['lyrics'] as const,
	smartFetchLyrics: (uniqueKey?: string, keyword?: string) =>
		[...lyricsQueryKeys.all, 'smartFetchLyrics', uniqueKey, keyword] as const,
}

export const useSmartFetchLyrics = (track?: Track) => {
	const enabled = !!track
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: lyricsQueryKeys.smartFetchLyrics(track?.uniqueKey, track?.title),
		queryFn: async () => {
			const result = await lyricService.smartFetchLyrics(track!)
			if (result.isErr()) {
				if (result.error.type === 'SearchResultNoMatch') {
					return '未匹配到歌词，请手动搜索'
				}
				throw result.error
			}
			return result.value
		},
		enabled,
		staleTime: 24 * 60 * 1000,
	})
}
