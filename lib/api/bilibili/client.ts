interface ApiError {
  code: number
  message: string
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (data.code !== 0) {
        throw new Error(data.message || '请求失败')
      }

      return data.data
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API 请求失败: ${error.message}`)
      }
      throw error
    }
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
