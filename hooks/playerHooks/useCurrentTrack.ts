import type { Track } from '@/types/core/media'
import { usePlayerStore } from '../stores/usePlayerStore'

const useCurrentTrack = (): Track | null => {
	return usePlayerStore((state) =>
		state.currentTrackKey
			? (state.tracks[state.currentTrackKey] ?? null)
			: null,
	)
}

export default useCurrentTrack
