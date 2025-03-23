import * as Sentry from '@sentry/react-native'

const logError = (message: string, error: unknown, scope = 'Player') => {
  console.error(`[${scope} Error] ${message}`, error)

  // 向 Sentry 报告错误
  Sentry.captureException(error, {
    tags: {
      scope,
    },
    extra: {
      message,
    },
  })
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
