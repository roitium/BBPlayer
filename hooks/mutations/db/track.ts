import { playlistKeys } from '@/hooks/queries/db/playlist'
import { queryClient } from '@/lib/config/queryClient'
import { trackService } from '@/lib/services/trackService'
import type { Track } from '@/types/core/media'
import { useMutation } from '@tanstack/react-query'

queryClient.setMutationDefaults(['db', 'track'], {
	retry: false,
})

export const useRenameTrack = () => {
	return useMutation({
		mutationKey: ['db', 'track', 'rename'],
		mutationFn: async ({
			trackId,
			newTitle,
			source,
		}: {
			trackId: number
			newTitle: string
			source: Track['source']
		}) => {
			const result = await trackService.updateTrack({
				id: trackId,
				title: newTitle,
				source,
			})
			if (result.isErr()) throw result.error
			return result.value
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [...playlistKeys.all, 'playlistContents'],
			})
		},
		onError: (error, { trackId }) =>
			console.error('重命名歌曲失败', trackId, error),
	})
}
