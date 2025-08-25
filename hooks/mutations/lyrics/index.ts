import { lyricsQueryKeys } from '@/hooks/queries/lyrics'
import { queryClient } from '@/lib/config/queryClient'
import lyricService from '@/lib/services/lyricService'
import type { LyricSearchResult } from '@/types/player/lyrics'
import toast from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'

export const useFetchLyrics = () => {
	return useMutation({
		mutationKey: ['lyrics', 'fetchLyrics'],
		mutationFn: async ({
			uniqueKey,
			item,
		}: {
			uniqueKey: string
			item: LyricSearchResult[0]
		}) => {
			const result = await lyricService.fetchLyrics(item, uniqueKey)
			if (result.isErr()) {
				throw result.error
			}
			return result.value
		},
		onSuccess: (_, { uniqueKey }) => {
			toast.show('歌词获取成功')
			void queryClient.invalidateQueries({
				queryKey: lyricsQueryKeys.smartFetchLyrics(uniqueKey),
			})
		},
	})
}
