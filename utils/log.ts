import * as Sentry from '@sentry/react-native'
import * as EXPOFS from 'expo-file-system'
import { InteractionManager } from 'react-native'
import {
	fileAsyncTransport,
	logger,
	mapConsoleTransport,
} from 'react-native-logs'

// 创建 Logger 实例
const config = {
	severity: 'debug',
	transport: [mapConsoleTransport, fileAsyncTransport],
	levels: {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3,
	},
	transportOptions: {
		SENTRY: Sentry,
		errorLevels: 'sentry',
		FS: EXPOFS,
		fileName: 'logs_{date-today}.log',
		fileNameDateType: 'iso',
		mapLevels: {
			debug: 'log',
			info: 'info',
			warn: 'warn',
			error: 'error',
		},
	},
	asyncFunc: InteractionManager.runAfterInteractions.bind(InteractionManager),
	async: true,
}

// @ts-expect-error 忽略 TS 报错
const log = logger.createLogger(config)

export default log
