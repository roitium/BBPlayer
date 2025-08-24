/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* 这些代码从 https://github.com/nooblong/NeteaseCloudMusicApiBackup/ 抄的，但做了进一步封装和解耦，凑合着用 */
import type { Result } from 'neverthrow'
import { ResultAsync, err, ok } from 'neverthrow'
import * as setCookie from 'set-cookie-parser'

import { NeteaseApiError } from '@/lib/errors/thirdparty/netease'
import * as Encrypt from './crypto'
import { cookieObjToString, cookieToJson, toBoolean } from './utils'

interface AppConfig {
	domain: string
	apiDomain: string
	encryptResponse: boolean
}

const APP_CONF: AppConfig = {
	domain: 'https://music.163.com',
	apiDomain: 'https://interface3.music.163.com',
	encryptResponse: true,
}

const chooseUserAgent = (uaType: 'pc' | 'linux' | 'iphone' = 'pc'): string => {
	const userAgentMap: Record<string, string> = {
		pc: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
		linux:
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
		iphone: 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)',
	}
	return userAgentMap[uaType] || userAgentMap.pc
}

export interface RequestOptions {
	cookie?: Record<string, string> | string
	ua?: string
	crypto?: 'weapi' | 'linuxapi' | 'eapi'
	headers?: Record<string, string>
	e_r?: boolean
}

interface RequestPayload {
	url: string
	headers: Record<string, string>
	body: object
	e_r: boolean
}

const buildRequestPayload = <T extends object>(
	uri: string,
	data: T,
	options: RequestOptions,
): RequestPayload => {
	const { ua, crypto = 'weapi' } = options
	const cookie =
		typeof options.cookie === 'string'
			? cookieToJson(options.cookie)
			: (options.cookie ?? {})

	const csrfToken = cookie.__csrf || ''
	let url = ''
	const headers: Record<string, string> = {
		'User-Agent':
			ua ?? chooseUserAgent(crypto === 'linuxapi' ? 'linux' : 'iphone'),
		'Content-Type': 'application/x-www-form-urlencoded',
		Referer: APP_CONF.domain,
		...options.headers,
	}
	let body = {}
	let e_r = false

	switch (crypto) {
		case 'weapi': {
			const weapiData = { ...data, csrf_token: csrfToken }
			body = Encrypt.weapi(weapiData)
			url = `${APP_CONF.domain}/weapi/${uri.substring(5)}`
			break
		}
		case 'linuxapi': {
			body = Encrypt.linuxapi({
				method: 'POST',
				url: APP_CONF.domain + uri,
				params: data,
			})
			url = `${APP_CONF.domain}/api/linux/forward`
			break
		}
		case 'eapi': {
			const header = {
				osver: cookie.osver || '',
				deviceId: cookie.deviceId || '',
				os: cookie.os || 'iphone',
				appver: cookie.appver || '9.0.90',
				__csrf: csrfToken,
			}
			const eapiData = {
				...data,
				header,
				e_r: toBoolean(options.e_r ?? APP_CONF.encryptResponse),
			}
			e_r = eapiData.e_r
			body = Encrypt.eapi(uri, eapiData)
			url = `${APP_CONF.apiDomain}/eapi/${uri.substring(5)}`
			headers.Cookie = cookieObjToString(header)
			break
		}
		default:
		// pass
	}

	return { url, headers, body, e_r }
}

interface FetchResult<TReturnBody> {
	body: TReturnBody
	cookie: string[]
}

const executeFetch = <TReturnBody>(
	payload: RequestPayload,
): ResultAsync<FetchResult<TReturnBody>, NeteaseApiError> => {
	const { url, headers, body, e_r } = payload
	const settings = {
		method: 'POST',
		headers,
		body: new URLSearchParams(body as Record<string, string>).toString(),
	}

	return ResultAsync.fromPromise(
		fetch(url, settings).then(async (res) => {
			if (!res.ok) {
				return err(
					new NeteaseApiError({
						message: '请求失败！http 状态码不符合预期！',
						type: 'ResponseFailed',
						msgCode: res.status,
						rawData: res.statusText,
					}),
				)
			}

			const responseBody = e_r
				? Encrypt.eapiResDecrypt(
						Buffer.from(await res.arrayBuffer())
							.toString('hex')
							.toUpperCase(),
					)
				: await res.json()

			const parsedCookies = setCookie.parse(res.headers.get('set-cookie') ?? '')
			const cookies = parsedCookies.map(
				(cookie) => `${cookie.name}=${cookie.value}`,
			)

			return ok({
				body: responseBody,
				cookie: cookies,
			})
		}),
		(e: unknown) =>
			// 按理来说不应该发生
			new NeteaseApiError({
				message: '请求失败！',
				type: 'RequestFailed',
				msgCode: 500,
				cause: e,
			}),
	).andThen((res) => res as Result<FetchResult<TReturnBody>, NeteaseApiError>)
}

export const createRequest = <TData extends object, TReturnBody>(
	uri: string,
	data: TData,
	options: RequestOptions,
): ResultAsync<FetchResult<TReturnBody>, NeteaseApiError> => {
	const payloadResult = buildRequestPayload(uri, data, options)

	return executeFetch(payloadResult)
}
