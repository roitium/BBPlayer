import type { ProjectScope } from '@/types/core/scope'
import * as Sentry from '@sentry/react-native'
import * as EXPOFS from 'expo-file-system'
import { err, ok, type Result } from 'neverthrow'
import { InteractionManager } from 'react-native'
import {
	fileAsyncTransport,
	logger,
	mapConsoleTransport,
} from 'react-native-logs'
import toast from './toast'

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
 * 清理 {keepDays} 天之前的日志文件
 * 文件命名规则：logs_YYYY-MM-DD.log，路径：EXPOFS.documentDirectory
 */
export async function cleanOldLogFiles(
	keepDays = 7,
): Promise<Result<number, Error>> {
	try {
		const dir = EXPOFS.documentDirectory
		if (!dir) return err(new Error('No documentDirectory'))
		const list = await EXPOFS.readDirectoryAsync(dir)
		const now = Date.now()
		const threshold = now - keepDays * 24 * 60 * 60 * 1000
		const re = /^logs_(\d{4}-\d{2}-\d{2})\.log$/

		let deleted = 0
		for (const name of list) {
			const m = re.exec(name)
			if (!m) continue
			const dateStr = m[1]
			const time = Date.parse(dateStr)
			if (Number.isNaN(time)) continue
			if (time <= threshold) {
				const path = `${dir}${name}`
				try {
					await EXPOFS.deleteAsync(path, { idempotent: true })
					deleted += 1
				} catch (e) {
					// 记录但不中断
					log.warn('删除日志文件失败', { path, error: String(e) })
				}
			}
		}
		return ok(deleted)
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)))
	}
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

/**
 * 将错误消息和错误堆栈信息显示在 toast 上，并将错误信息记录到日志中（用于最顶端的调用者消费错误）
 * @param error 原始错误对象
 * @param message 需要显示的信息
 */
export function toastAndLogError(message: string, error: Error) {
	toast.error(message, {
		description: message ?? flatErrorMessage(error),
		duration: Number.POSITIVE_INFINITY,
	})
	log.error(`${message}: ${flatErrorMessage(error)}`)
}

// @ts-expect-error 忽略 TS 报错
const log = logger.createLogger(config)

export default log
