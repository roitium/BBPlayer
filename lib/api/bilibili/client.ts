import { BilibiliApiError } from '@/utils/errors'

type ReqResponse<T> = {
  code: number
  message: string
  data: T
}

class ApiClient {
  private baseUrl = 'https://api.bilibili.com'

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cookie = '',
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      Cookie: cookie,
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
      ...options.headers,
    }
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = new Error(
        `请求 ${url} 失败: ${response.status} ${response.statusText}`,
      )
      throw error
    }

    const data: ReqResponse<T> = await response.json()

    if (data.code !== 0) {
      const apiError = new BilibiliApiError(data.message, data.code, data.data)
      throw apiError
    }

    return data.data
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    cookie = '',
  ): Promise<T> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint
    return this.request<T>(url, { method: 'GET' }, cookie)
  }

  async post<T>(endpoint: string, data?: unknown, cookie = ''): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      },
      cookie,
    )
  }
}

export const apiClient = new ApiClient()
