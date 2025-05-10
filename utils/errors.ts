export enum BilibiliApiErrorType {
  // 请求过程出错（http 状态码非 2xx）
  RequestFailed = 'RequestFailed',
  // bilibili 返回非 0 状态码
  ResponseFailed = 'ResponseFailed',
}

class BilibiliApiError extends Error {
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

class CsrfError extends Error {
  constructor(
    message: string,
    public context?: unknown,
  ) {
    super(message)
    this.name = 'CsrfError'
  }
}

class AudioStreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AudioStreamError'
  }
}

type BilibiliApiMethodError = BilibiliApiError | CsrfError | AudioStreamError

export {
  BilibiliApiError,
  CsrfError,
  AudioStreamError,
  type BilibiliApiMethodError,
}
