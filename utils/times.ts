// 格式化秒数为 HH:MM
export const formatDurationToHHMM = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// HH:MM 转换为秒
export const formatHHMMToSeconds = (duration: string): number => {
  const [hours, minutes, seconds] = duration.split(':').map(Number)
  console.log(hours, minutes, seconds)
  return hours * 3600 + minutes * 60 + seconds
}
