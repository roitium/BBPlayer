import { useShallow } from 'zustand/shallow'
import type { Track } from '@/types/core/media'
import { usePlayerStore } from '../stores/usePlayerStore'

/**
 * 一个自定义 Hook，用于从 PlayerStore 中获取当前要显示的播放队列。
 * 它会自动处理随机模式和顺序模式。
 * @returns {Track[]} 当前应显示的有序歌曲对象数组。
 */
const useCurrentQueue = (): Track[] => {
	const displayQueue = usePlayerStore(
		useShallow((state) => {
			const activeKeyList = state.shuffleMode
				? state.shuffledList
				: state.orderedList

			return activeKeyList
				.map((key) => state.tracks[key])
				.filter(Boolean) as Track[]
		}),
	)

	return displayQueue
}

export default useCurrentQueue
