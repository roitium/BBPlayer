/**
 * 通用的自定义错误基类，用于统一处理错误名称和堆栈信息。
 */
export class CustomError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message, { cause: cause })
		this.name = this.constructor.name
	}
}

/**
 * 所有与 API 调用相关的错误的基类，提供语义上的区分。
 */
export class ApiCallingError extends CustomError {}

/**
 * 表示文件系统操作失败的错误。
 */
export class FileSystemError extends CustomError {}

/**
 * 表示数据解析或转换失败的错误。
 */
export class DataParsingError extends CustomError {}
