import Bottleneck from 'bottleneck'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { BilibiliApiError, BilibiliApiErrorType } from '@/utils/errors'
import { wrapResultAsyncFunction } from '@/utils/neverthrowUtils'

type ReqResponse<T> = {
  code: number
  message: string
  data: T
}

class ApiClient {
  private baseUrl = 'https://api.bilibili.com'
  private throttle = new Bottleneck({
    minTime: 200,
    maxConcurrent: 5,
    trackDoneStatus: true,
  })

  /**
   * 核心请求方法，使用 neverthrow 进行封装
   * @param endpoint API 端点
   * @param options Fetch 请求选项
   * @param cookie Cookie 字符串
   * @returns ResultAsync 包含成功数据或错误
   */
  private request = <T>(
    endpoint: string,
    options: RequestInit = {},
    cookie = '',
  ): ResultAsync<T, BilibiliApiError> => {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      Cookie: cookie,
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
      ...options.headers,
    }

    return ResultAsync.fromPromise(
      fetch(url, {
        ...options,
        headers,
      }),
      (error) =>
        new BilibiliApiError(
          error instanceof Error ? error.message : String(error),
          0,
          null,
          BilibiliApiErrorType.RequestFailed,
        ),
    )
      .andThen((response) => {
        if (!response.ok) {
          return errAsync(
            new BilibiliApiError(
              `请求 bilibili API 失败: ${response.status} ${response.statusText}`,
              response.status,
              null,
              BilibiliApiErrorType.RequestFailed,
            ),
          )
        }
        return ResultAsync.fromPromise(
          response.json() as Promise<ReqResponse<T>>,
          (error) =>
            new BilibiliApiError(
              error instanceof Error ? error.message : String(error),
              0,
              null,
              BilibiliApiErrorType.ResponseFailed,
            ),
        )
      })
      .andThen((data) => {
        if (data.code !== 0) {
          return errAsync(
            new BilibiliApiError(
              data.message,
              data.code,
              data.data,
              BilibiliApiErrorType.ResponseFailed,
            ),
          )
        }
        return okAsync(data.data)
      })
  }

  /**
   * 发送 GET 请求
   * @param endpoint API 端点
   * @param params URL 查询参数
   * @param cookie Cookie 字符串
   * @returns ResultAsync 包含成功数据或错误
   */
  get<T>(
    endpoint: string,
    params?: Record<string, string>,
    cookie = '',
  ): ResultAsync<T, BilibiliApiError> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint
    return wrapResultAsyncFunction(() =>
      this.throttle.schedule(() =>
        this.request<T>(url, { method: 'GET' }, cookie),
      ),
    )()
  }

  /**
   * 发送 POST 请求
   * @param endpoint API 端点
   * @param data 请求体数据
   * @param cookie Cookie 字符串
   * @param headers 请求头（默认请求类型为 application/x-www-form-urlencoded）
   * @returns ResultAsync 包含成功数据或错误
   */
  post<T>(
    endpoint: string,
    data?: BodyInit,
    cookie = '',
    headers?: Record<string, string>,
  ): ResultAsync<T, BilibiliApiError> {
    return wrapResultAsyncFunction(() =>
      this.throttle.schedule(() =>
        this.request<T>(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              ...headers,
            },
            body: data,
          },
          cookie,
        ),
      ),
    )()
  }
}

export const apiClient = new ApiClient()
