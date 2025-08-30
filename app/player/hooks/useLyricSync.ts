import useTrackProgress from '@/hooks/player/useTrackProgress'
import type { LyricLine } from '@/types/player/lyrics'
import type { FlashListRef } from '@shopify/flash-list'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function useLyricSync(
	lyrics: LyricLine[],
	flashListRef: RefObject<FlashListRef<LyricLine> | null>,
	seekTo: (position: number) => void,
	offset: number, // 单位秒
) {
	const [currentLyricIndex, setCurrentLyricIndex] = useState(0)
	const isManualScrollingRef = useRef(false)
	const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const { position } = useTrackProgress()
	const offsetedPosition = position + offset

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

	const onUserScrollStart = useCallback(() => {
		if (!lyrics.length) return
		if (manualScrollTimeoutRef.current) {
			clearTimeout(manualScrollTimeoutRef.current)
			manualScrollTimeoutRef.current = null
		}
		isManualScrollingRef.current = true
	}, [lyrics.length])

	const onUserScrollEnd = useCallback(() => {
		if (!lyrics.length) return
		if (manualScrollTimeoutRef.current)
			clearTimeout(manualScrollTimeoutRef.current)

		manualScrollTimeoutRef.current = setTimeout(() => {
			manualScrollTimeoutRef.current = null
			isManualScrollingRef.current = false

			void flashListRef.current?.scrollToIndex({
				animated: true,
				index: currentLyricIndex,
				viewPosition: 0.5,
			})
		}, 2000)
	}, [lyrics.length, flashListRef, currentLyricIndex])

	const handleJumpToLyric = useCallback(
		(index: number) => {
			if (lyrics.length === 0) return
			if (!lyrics[index]) return
			seekTo(lyrics[index].timestamp)
			if (manualScrollTimeoutRef.current) {
				clearTimeout(manualScrollTimeoutRef.current)
				manualScrollTimeoutRef.current = null
			}
			isManualScrollingRef.current = false
		},
		[lyrics, seekTo],
	)

	// 计算并更新当前歌词的索引
	useEffect(() => {
		if (lyrics.length === 0) return
		if (offsetedPosition <= 0) {
			// 如果便宜后的时间小于等于0，直接定位到第一句
			if (currentLyricIndex !== 0) setCurrentLyricIndex(0)
			return
		}
		const index = findIndexForTime(offsetedPosition)
		if (index === currentLyricIndex) return
		setCurrentLyricIndex(index)
	}, [currentLyricIndex, findIndexForTime, lyrics.length, offsetedPosition])

	// 当歌词发生变化且用户没自己滚时，滚动到当前歌词
	useEffect(() => {
		if (isManualScrollingRef.current || manualScrollTimeoutRef.current) return
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
		handleJumpToLyric,
		onUserScrollStart,
		onUserScrollEnd,
	}
}
