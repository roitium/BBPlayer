import useAppStore from '@/hooks/stores/useAppStore'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { BilibiliApiError, BilibiliApiErrorType } from './errors'

type ReqResponse<T> = {
	code: number
	message: string
	data: T
}

class ApiClient {
	private baseUrl = 'https://api.bilibili.com'

	/**
	 * 核心请求方法，使用 neverthrow 进行封装
	 * @param endpoint API 端点
	 * @param options Fetch 请求选项
	 * @param allowMissingCookie 是否允许缺少 cookie
	 * @returns ResultAsync 包含成功数据或错误
	 */
	private request = <T>(
		endpoint: string,
		options: RequestInit = {},
		fullUrl?: string,
		allowMissingCookie = false,
	): ResultAsync<T, BilibiliApiError> => {
		const url = fullUrl || `${this.baseUrl}${endpoint}`
		const cookie = useAppStore.getState().bilibiliCookieString
		if (!cookie && !allowMissingCookie) {
			return errAsync(
				new BilibiliApiError({
					message: '未设置 bilibili Cookie，请先登录',
					type: BilibiliApiErrorType.NoCookie,
				}),
			)
		}

		const headers = {
			Cookie: cookie ?? '',
			'User-Agent':
				'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
			...options.headers,
		}

		return ResultAsync.fromPromise(
			fetch(url, {
				...options,
				headers,
				// react native 实现了 cookie 的自动注入，但我们正在自己管理 cookie，所以忽略
				// TODO: 应该采用 react-native-cookie 库实现与原生请求库 cookie jar 的更紧密集成。但现阶段我们直接忽略原生注入的 cookie。
				credentials: 'omit',
			}),
			(error) =>
				new BilibiliApiError({
					message: error instanceof Error ? error.message : String(error),
					type: BilibiliApiErrorType.RequestFailed,
				}),
		)
			.andThen((response) => {
				if (!response.ok) {
					return errAsync(
						new BilibiliApiError({
							message: `请求 bilibili API 失败: ${response.status} ${response.statusText}`,
							msgCode: response.status,
							type: BilibiliApiErrorType.RequestFailed,
						}),
					)
				}
				return ResultAsync.fromPromise(
					response.json() as Promise<ReqResponse<T>>,
					(error) =>
						new BilibiliApiError({
							message: error instanceof Error ? error.message : String(error),
							type: BilibiliApiErrorType.ResponseFailed,
						}),
				)
			})
			.andThen((data) => {
				if (data.code !== 0) {
					return errAsync(
						new BilibiliApiError({
							message: data.message,
							msgCode: data.code,
							rawData: data.data,
							type: BilibiliApiErrorType.ResponseFailed,
						}),
					)
				}
				return okAsync(data.data)
			})
	}

	/**
	 * 发送 GET 请求
	 * @param endpoint API 端点
	 * @param params URL 查询参数
	 * @param fullUrl 完整的 URL，如果提供则忽略 baseUrl
	 * @param allowMissingCookie 是否允许缺少 cookie
	 * @returns ResultAsync 包含成功数据或错误
	 */
	get<T>(
		endpoint: string,
		params?: Record<string, string> | string,
		fullUrl?: string,
		allowMissingCookie = false,
	): ResultAsync<T, BilibiliApiError> {
		let url = endpoint
		if (typeof params === 'string') {
			url = `${endpoint}?${params}`
		} else if (params) {
			url = `${endpoint}?${new URLSearchParams(params).toString()}`
		}
		return this.request<T>(url, { method: 'GET' }, fullUrl, allowMissingCookie)
	}

	/**
	 * 发送 POST 请求
	 * @param endpoint API 端点
	 * @param data 请求体数据
	 * @param headers 请求头（默认请求类型为 application/x-www-form-urlencoded）
	 * @param fullUrl 完整的 URL，如果提供则忽略 baseUrl
	 * @param allowMissingCookie 是否允许缺少 cookie
	 * @returns ResultAsync 包含成功数据或错误
	 */
	post<T>(
		endpoint: string,
		data?: BodyInit,
		headers?: Record<string, string>,
		fullUrl?: string,
		allowMissingCookie = false,
	): ResultAsync<T, BilibiliApiError> {
		return this.request<T>(
			endpoint,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					...headers,
				},
				body: data,
			},
			fullUrl,
			allowMissingCookie,
		)
	}
}

export const bilibiliApiClient = new ApiClient()
