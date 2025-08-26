import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import { toastAndLogError } from '@/utils/log'
import { useCallback } from 'react'

const SCOPE = 'UI.Playlist.Local.Player'

export function useLocalPlaylistPlayer(tracks: Track[]) {
	const addToQueue = usePlayerStore((state) => state.addToQueue)

	const playAll = useCallback(
		async (startFromId?: string) => {
			try {
				if (!tracks || tracks.length === 0) return
				await addToQueue({
					tracks: tracks,
					playNow: true,
					clearQueue: true,
					startFromKey: startFromId,
					playNext: false,
				})
			} catch (error) {
				toastAndLogError('播放全部失败', error, SCOPE)
			}
		},
		[addToQueue, tracks],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			void playAll(track.uniqueKey)
		},
		[playAll],
	)

	return { playAll, handleTrackPress }
}
