import {
	usePlaybackProgress,
	usePlayerStore,
} from '@/hooks/stores/usePlayerStore'
import { useCallback, useState } from 'react'

export function usePlayerSlider() {
	const seekTo = usePlayerStore((state) => state.seekTo)
	const { position, duration } = usePlaybackProgress(100)

	const [isSeeking, setIsSeeking] = useState(false)
	const [seekValue, setSeekValue] = useState(0)

	const handleSlidingStart = useCallback(() => {
		if (duration > 0) {
			setIsSeeking(true)
			setSeekValue(position)
		}
	}, [position, duration])

	const handleSlidingChange = useCallback((value: number) => {
		setSeekValue(value)
	}, [])

	const handleSlidingComplete = useCallback(
		(value: number) => {
			setIsSeeking(false)
			if (duration > 0) {
				seekTo(value)
			}
		},
		[seekTo, duration],
	)

	const isSliderEnabled = duration > 0 && !Number.isNaN(duration)
	const currentSliderPosition = isSeeking
		? seekValue
		: isSliderEnabled
			? Math.min(position, duration)
			: 0
	const maxSliderValue = isSliderEnabled ? duration : 1

	return {
		isSliderEnabled,
		currentSliderPosition,
		maxSliderValue,
		handleSlidingStart,
		handleSlidingChange,
		handleSlidingComplete,
		duration,
	}
}
