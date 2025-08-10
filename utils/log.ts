import type { ProjectScope } from '@/types/core/scope'
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

/**
 * 将 Error 对象的 message、cause 递归展开为字符串，类似于 golang 的错误链
 * @param error 任何 Error 的子类
 * @param separator 分隔符
 * @param maxDepth 最大递归深度
 * @returns 一个用 separator 拼接的字符串
 */

export function flatErrorMessage(
	error: Error,
	separator = ':: ',
	_temp: string[] = [],
	_depth = 0,
	maxDepth = 10,
) {
	_temp.push(error.message)
	if (_depth >= maxDepth) {
		_temp.push('[error depth exceeded]')
		return _temp.join(separator)
	}
	if (error.cause) {
		if (error.cause instanceof Error) {
			flatErrorMessage(error.cause, separator, _temp, _depth + 1)
		}
	}
	return _temp.join(separator)
}

/**
 * 将 Error 上报到 Sentry
 * @param error
 * @param scope 项目不同分区
 * @param message 附加信息
 */

export function reportErrorToSentry(
	error: unknown,
	message?: string,
	scope?: ProjectScope,
) {
	Sentry.captureException(error, {
		tags: {
			appScope: scope,
		},
		extra: {
			message,
		},
	})
}

// @ts-expect-error 忽略 TS 报错
const log = logger.createLogger(config)

export default log
