import type { Track } from '@/types/core/media'
import { usePlayerStore } from '../usePlayerStore'

const useCurrentTrack = (): Track | null => {
	return usePlayerStore((state) =>
		state.currentTrackUniqueKey
			? (state.tracks[state.currentTrackUniqueKey] ?? null)
			: null,
	)
}

export default useCurrentTrack
