import type { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import log from '@/utils/log'
import { storage } from '@/utils/mmkv'
import md5 from 'md5'
import { okAsync, type ResultAsync } from 'neverthrow'
import { bilibiliApiClient } from './client'

const logger = log.extend('3Party.Bilibili.Wbi')

const mixinKeyEncTab = [
	46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
	33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
	26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
	20, 34, 44, 52,
]

// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig: string) =>
	mixinKeyEncTab
		.map((n) => orig[n])
		.join('')
		.slice(0, 32)

// 为请求参数进行 wbi 签名
function encWbi(
	params: Record<string, string | number | object>,
	img_key: string,
	sub_key: string,
) {
	const mixin_key = getMixinKey(img_key + sub_key)
	const curr_time = Math.round(Date.now() / 1000)
	const chr_filter = /[!'()*]/g

	Object.assign(params, { wts: curr_time }) // 添加 wts 字段
	// 按照 key 重排参数
	const query = Object.keys(params)
		.sort()
		.map((key) => {
			// 过滤 value 中的 "!'()*" 字符
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			const value = params[key].toString().replace(chr_filter, '')
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
		})
		.join('&')

	const wbi_sign = md5(query + mixin_key) // 计算 w_rid

	return `${query}&w_rid=${wbi_sign}`
}

function isSameDayAsToday(timestamp: number) {
	const dateToCompare = new Date(timestamp)

	if (Number.isNaN(dateToCompare.getTime())) {
		logger.error('提供的时间戳无效:', timestamp)
		return false
	}

	const now = new Date()

	return (
		dateToCompare.getFullYear() === now.getFullYear() &&
		dateToCompare.getMonth() === now.getMonth() &&
		dateToCompare.getDate() === now.getDate()
	)
}

interface WbiKeys {
	img_key: string
	sub_key: string
	timestamp: number // 获取时间
}

function getWbiKeysFromStorage() {
	const keys = storage.getString('wbi_keys')
	if (!keys) return null
	try {
		return JSON.parse(keys) as WbiKeys
	} catch (error) {
		logger.warning('从本地解析 wbi_keys 失败，尝试重新获取:', error)
		return null
	}
}

/**
 * 获取最新的 img_key 和 sub_key
 */
function getWbiKeys(): ResultAsync<
	{
		img_key: string
		sub_key: string
	},
	BilibiliApiError
> {
	const localKeys = getWbiKeysFromStorage()
	if (localKeys) {
		if (isSameDayAsToday(localKeys.timestamp)) {
			return okAsync(localKeys)
		}
		logger.debug('本地 wbi_keys 已过期，重新获取')
	}
	const result = bilibiliApiClient.get<{
		wbi_img: { img_url: string; sub_url: string }
	}>('/x/web-interface/nav', undefined)
	return result.map(({ wbi_img: { img_url, sub_url } }) => {
		const img_key = img_url.slice(
			img_url.lastIndexOf('/') + 1,
			img_url.lastIndexOf('.'),
		)
		const sub_key = sub_url.slice(sub_url.lastIndexOf('/') + 1)
		storage.set(
			'wbi_keys',
			JSON.stringify({
				img_key: img_key,
				sub_key: sub_key,
				timestamp: Date.now(),
			}),
		)
		return { img_key: img_key, sub_key: sub_key }
	})
}

export default function getWbiEncodedParams(
	params: Record<string, string | number | object>,
) {
	const result = getWbiKeys()
	return result.map(({ img_key, sub_key }) => encWbi(params, img_key, sub_key))
}
