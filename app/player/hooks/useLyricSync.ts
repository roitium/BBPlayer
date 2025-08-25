import type { LyricLine } from '@/types/player/lyrics'
import type { FlashListRef } from '@shopify/flash-list'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import TrackPlayer, { Event } from 'react-native-track-player'

export default function useLyricSync(
	lyrics: LyricLine[],
	flashListRef: RefObject<FlashListRef<LyricLine> | null>,
	seekTo: (position: number) => void,
) {
	const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
	const isManualScrollingRef = useRef(false)
	const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const findIndexForTime = useCallback(
		(timestamp: number) => {
			let lo = 0,
				hi = lyrics.length - 1,
				ans = 0
			while (lo <= hi) {
				const mid = Math.floor((lo + hi) / 2)
				if (lyrics[mid].timestamp <= timestamp) {
					ans = mid
					lo = mid + 1
				} else {
					hi = mid - 1
				}
			}
			return Math.max(0, Math.min(ans, lyrics.length - 1))
		},
		[lyrics],
	)

	const handleManualScrolling = useCallback(() => {
		if (lyrics.length === 0) return
		if (manualScrollTimeoutRef.current) {
			clearTimeout(manualScrollTimeoutRef.current)
		}
		manualScrollTimeoutRef.current = setTimeout(() => {
			manualScrollTimeoutRef.current = null
			isManualScrollingRef.current = false
			void flashListRef.current?.scrollToIndex({
				animated: true,
				index: currentLyricIndex,
				viewPosition: 0.5,
			})
		}, 1500)
		isManualScrollingRef.current = true
	}, [currentLyricIndex, flashListRef, lyrics.length])

	const handleJumpToLyric = useCallback(
		(index: number) => {
			if (lyrics.length === 0) return
			if (!lyrics[index]) return
			seekTo(lyrics[index].timestamp)
			if (manualScrollTimeoutRef.current) {
				clearTimeout(manualScrollTimeoutRef.current)
			}
			isManualScrollingRef.current = false
		},
		[lyrics, seekTo],
	)

	useEffect(() => {
		const handler = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			(e) => {
				if (isManualScrollingRef.current || lyrics.length === 0) return
				const { position } = e
				if (position <= 0) return
				const index = findIndexForTime(position)
				if (index === currentLyricIndex) return
				setCurrentLyricIndex(index)
			},
		)

		return () => {
			handler.remove()
		}
	}, [currentLyricIndex, findIndexForTime, lyrics.length])

	useEffect(() => {
		void flashListRef.current?.scrollToIndex({
			animated: true,
			index: currentLyricIndex,
			viewPosition: 0.5,
		})
	}, [currentLyricIndex, flashListRef])

	useEffect(() => {
		return () => {
			if (manualScrollTimeoutRef.current) {
				clearTimeout(manualScrollTimeoutRef.current)
			}
		}
	}, [])

	return {
		currentLyricIndex,
		handleManualScrolling,
		handleJumpToLyric,
	}
}
