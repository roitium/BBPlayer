// 格式化秒数为 (HH:)MM:SS
export const formatDurationToHHMMSS = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const remainingSeconds = seconds % 60
	if (hours === 0) {
		return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
	}
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

// MM:SS 转换为秒
export const formatMMSSToSeconds = (duration: string): number => {
	const [minutes, seconds] = duration.split(':').map(Number)
	return minutes * 60 + seconds
}
