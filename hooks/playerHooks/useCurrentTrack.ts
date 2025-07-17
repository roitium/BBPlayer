import type { Track } from '@/types/core/media'
import { usePlayerStore } from '../stores/usePlayerStore'

const useCurrentTrack = (): Track | null => {
	return usePlayerStore((state) =>
		state.currentTrackId ? (state.tracks[state.currentTrackId] ?? null) : null,
	)
}

export default useCurrentTrack
