import { useCallback, useEffect, useRef } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import TrackPlayer, { Event } from 'react-native-track-player'

export function usePlayerSlider() {
	// 为了避免释放时闪烁
	const overridePosition = useSharedValue<number | null>(null)
	const resyncTimer = useRef<NodeJS.Timeout | null>(null)
	const sharedPosition = useSharedValue(0)
	const sharedDuration = useSharedValue(0)

	useEffect(() => {
		const handler = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			(data) => {
				if (overridePosition.get() === null) {
					sharedPosition.set(data.position)
					sharedDuration.set(data.duration)
				}
			},
		)
		return () => handler.remove()
	}, [overridePosition, sharedDuration, sharedPosition])

	const handleSlidingStart = useCallback(
		(value: number) => {
			overridePosition.set(value)
			if (resyncTimer.current) {
				clearTimeout(resyncTimer.current)
				resyncTimer.current = null
			}
		},
		[overridePosition],
	)

	const handleSlidingComplete = useCallback(
		async (value: number) => {
			overridePosition.set(value)
			await TrackPlayer.seekTo(value)

			sharedPosition.set(value)

			resyncTimer.current = setTimeout(() => {
				overridePosition.set(null)
				resyncTimer.current = null
			}, 500)
		},
		[overridePosition, sharedPosition],
	)

	useEffect(() => {
		return () => {
			if (resyncTimer.current) {
				clearTimeout(resyncTimer.current)
				resyncTimer.current = null
			}
		}
	}, [])

	return {
		handleSlidingStart,
		handleSlidingComplete,
		sharedPosition,
		sharedDuration,
	}
}
