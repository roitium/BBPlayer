class BilibiliApiError<T> extends Error {
  msgCode: number
  rawData: T
  constructor(message: string, msgCode: number, rawData: T) {
    super(`请求 bilibili API 失败: ${message}`)
    this.name = 'BilibiliApiError'
    this.msgCode = msgCode
    this.rawData = rawData
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BilibiliApiError)
    }
  }
}

export { BilibiliApiError }
