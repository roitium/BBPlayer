export enum BilibiliApiErrorType {
  // 请求过程出错（http 状态码非 2xx）
  RequestFailed = 'RequestFailed',
  // bilibili 返回非 0 状态码
  ResponseFailed = 'ResponseFailed',
}

// 三方 API 调用错误类，遇到这种类型错误，直接抛给用户
class ApiCallingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiCallingError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiCallingError)
    }
  }
}

class BilibiliApiError extends ApiCallingError {
  msgCode: number
  type: BilibiliApiErrorType
  rawData: unknown
  constructor(
    message: string,
    msgCode: number,
    rawData: unknown,
    type: BilibiliApiErrorType,
  ) {
    super(`请求 bilibili API 失败: ${message}`)
    this.name = 'BilibiliApiError'
    this.msgCode = msgCode
    this.rawData = rawData
    this.type = type
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BilibiliApiError)
    }
  }
}

class NeteaseApiError extends ApiCallingError {
  msgCode: number
  rawData: unknown
  constructor(message: string, msgCode: number, rawData: unknown) {
    super(`请求网易云 API 失败: ${message}`)
    this.name = 'NeteaseApiError'
    this.msgCode = msgCode
    this.rawData = rawData
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NeteaseApiError)
    }
  }
}

class CsrfError extends ApiCallingError {
  constructor(
    message: string,
    public context?: unknown,
  ) {
    super(message)
    this.name = 'CsrfError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CsrfError)
    }
  }
}

class AudioStreamError extends ApiCallingError {
  constructor(message: string) {
    super(message)
    this.name = 'AudioStreamError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioStreamError)
    }
  }
}

export {
  BilibiliApiError,
  CsrfError,
  AudioStreamError,
  NeteaseApiError,
  ApiCallingError,
}
