import { usePlaybackProgress } from '@/hooks/stores/usePlayerStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import TrackPlayer from 'react-native-track-player'

export function usePlayerSlider() {
	const { position, duration } = usePlaybackProgress(100)
	// 设计这个 state 的主要目的是避免在释放进度条时，有短暂的「闪烁回原位置」的问题
	const [overridePosition, setOverridePosition] = useState<number | null>(null)
	const resyncTimer = useRef<NodeJS.Timeout | null>(null)

	const currentSliderPosition = overridePosition ?? position

	const handleSlidingStart = useCallback(() => {
		if (resyncTimer.current) {
			clearTimeout(resyncTimer.current)
		}
		setOverridePosition(position)
	}, [position])

	const handleSlidingChange = useCallback((value: number) => {
		setOverridePosition(value)
	}, [])

	const handleSlidingComplete = useCallback(async (value: number) => {
		setOverridePosition(value)
		await TrackPlayer.seekTo(value)

		resyncTimer.current = setTimeout(() => {
			setOverridePosition(null)
		}, 500)
	}, [])

	useEffect(() => {
		return () => {
			if (resyncTimer.current) {
				clearTimeout(resyncTimer.current)
			}
		}
	}, [])

	return {
		isSliderEnabled: duration > 0,
		maxSliderValue: duration > 0 ? duration : 1,
		currentSliderPosition,
		handleSlidingStart,
		handleSlidingChange,
		handleSlidingComplete,
		duration,
	}
}
