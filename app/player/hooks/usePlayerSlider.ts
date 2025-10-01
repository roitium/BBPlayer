import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import TrackPlayer, { Event } from 'react-native-track-player'

export function usePlayerSlider() {
	// 为了避免释放时闪烁
	const overridePosition = useSharedValue<number | null>(null)
	const resyncTimer = useRef<NodeJS.Timeout | null>(null)
	const sharedPosition = useSharedValue(0)
	const sharedDuration = useSharedValue(0)
	const isActive = useSharedValue(true)

	useEffect(() => {
		const appStateSubscription = AppState.addEventListener(
			'change',
			(nextAppState) => {
				if (nextAppState === 'active') {
					isActive.value = true
				}
			},
		)
		const handler = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			(data) => {
				if (overridePosition.get() === null && isActive.value) {
					sharedPosition.set(data.position)
					sharedDuration.set(data.duration)
				}
			},
		)
		return () => {
			handler.remove()
			appStateSubscription.remove()
		}
	}, [isActive, overridePosition, sharedDuration, sharedPosition])

	useEffect(() => {
		void TrackPlayer.getProgress().then((data) => {
			sharedPosition.set(data.position)
			sharedDuration.set(data.duration)
		})
	}, [sharedDuration, sharedPosition])

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
