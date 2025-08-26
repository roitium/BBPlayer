import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { BilibiliTrack } from '@/types/core/media'
import { useCallback } from 'react'

export function useRemotePlaylist() {
	const addToQueue = usePlayerStore((state) => state.addToQueue)

	const playTrack = useCallback(
		(track: BilibiliTrack, playNext = false) => {
			void addToQueue({
				tracks: [track],
				playNow: !playNext,
				clearQueue: false,
				playNext: playNext,
				startFromKey: track.uniqueKey,
			})
		},
		[addToQueue],
	)

	return { playTrack }
}
