import * as Sentry from '@sentry/react-native'
import * as EXPOFS from 'expo-file-system'
import { InteractionManager } from 'react-native'
import {
  fileAsyncTransport,
  logger,
  mapConsoleTransport,
  sentryTransport,
} from 'react-native-logs'

// 创建 Logger 实例
const config = {
  severity: 'debug',
  transport: [mapConsoleTransport, fileAsyncTransport, sentryTransport],
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    sentry: 4, // 只有使用这个级别才会被 Sentry 捕获为 error
  },
  transportOptions: {
    SENTRY: Sentry,
    errorLevels: 'sentry',
    FS: EXPOFS,
    fileName: 'logs_{date-today}', // Create a new file every day
    fileNameDateType: 'iso',
    mapLevels: {
      debug: 'log',
      info: 'info',
      warn: 'warn',
      error: 'error',
      sentry: 'error',
    },
  },
  asyncFunc: InteractionManager.runAfterInteractions,
  async: true,
}

// @ts-ignore 忽略 TS 报错
const log = logger.createLogger(config)

export default log
