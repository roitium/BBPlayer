/* 这些代码从 https://github.com/nooblong/NeteaseCloudMusicApiBackup/ 抄的，能别动就别动！！！！ */
export function cookieToJson(cookie: string): Record<string, string> {
	const cookieArr = cookie.split(';')
	const obj: Record<string, string> = {}
	cookieArr.forEach((i) => {
		const arr = i.trim().split('=')
		obj[arr[0]] = arr[1]
	})
	return obj
}

export function cookieObjToString(
	cookie: Record<string, string> | string,
): string {
	if (typeof cookie !== 'object') return cookie
	return Object.entries(cookie)
		.map(([key, value]) => `${key}=${value}`)
		.join('; ')
}

export function toBoolean(value: unknown): boolean {
	return value === 'true' || value === true
}

export interface Query {
	crypto?: 'weapi' | 'linuxapi' | 'eapi'
	cookie?: string | Record<string, string>
	ua?: string
	proxy?: string
	realIP?: string
	e_r?: boolean
}

export function createOption(
	query: Query,
	crypto: 'weapi' | 'linuxapi' | 'eapi' | '' = '',
) {
	return {
		crypto: (query.crypto ?? crypto) || 'weapi',
		cookie: query.cookie,
		ua: query.ua,
		proxy: query.proxy,
		realIP: query.realIP,
		e_r: query.e_r,
	}
}
