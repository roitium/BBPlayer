const logError = (message: string, error: unknown, scope = 'Player') => {
  console.error(`[${scope} Error] ${message}`, error)
}

// 增强版调试日志，包含时间戳
const logDetailedDebug = (
  message: string,
  data?: unknown,
  scope = 'Player',
) => {
  const timestamp = new Date().toISOString()
  console.log(`[${scope} Debug ${timestamp}] ${message}`, data ? data : '')
}

export { logError, logDetailedDebug }
