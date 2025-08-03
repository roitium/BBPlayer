import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 获取传入时间到现在的相对时间
 * @param date 时间戳或 Date 对象
 * @returns 相对时间
 */
export function formatRelativeTime(date: Date | string | number): string {
	return dayjs(date).fromNow()
}

/**
 * 格式化秒数为 (HH:)MM:SS 格式
 * @param seconds
 * @returns
 */
export const formatDurationToHHMMSS = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const remainingSeconds = seconds % 60
	if (hours === 0) {
		return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
	}
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

/**
 * MM:SS 格式转换为秒数
 * @param duration
 * @returns
 */
export const formatMMSSToSeconds = (duration: string): number => {
	const [minutes, seconds] = duration.split(':').map(Number)
	return minutes * 60 + seconds
}
