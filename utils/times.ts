// 格式化秒数为 HH:MM
export const formatDurationToHHMM = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// HH:MM 转换为秒
export const formatHHMMToSeconds = (duration: string): number => {
  const [hours, minutes] = duration.split(':').map(Number)
  return hours * 3600 + minutes * 60
}
