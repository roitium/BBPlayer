import useAppStore from '@/hooks/stores/useAppStore'
import { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

/**
 * 转换B站bvid为avid
 * 这种基础函数报错的可能性很小，不做处理
 */
export function bv2av(bvid: string): number {
	const XOR_CODE = 23442827791579n
	const MASK_CODE = 2251799813685247n
	const BASE = 58n

	const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'
	const bvidArr = Array.from(bvid)
	;[bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]]
	;[bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]]
	bvidArr.splice(0, 3)
	const tmp = bvidArr.reduce(
		(pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)),
		0n,
	)
	return Number((tmp & MASK_CODE) ^ XOR_CODE)
}

/**
 * 将 AV 号转换为 BV 号。
 * @param avid
 * @returns bvid
 */
export function av2bv(avid: number | bigint): string {
	const XOR_CODE = 23442827791579n
	const MAX_AID = 2251799813685248n
	const BASE = 58n
	const MAGIC_STR = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'

	let tempNum = (BigInt(avid) | MAX_AID) ^ XOR_CODE

	const resultArray = Array.from('BV1000000000')

	for (let i = 11; i >= 3; i--) {
		resultArray[i] = MAGIC_STR[Number(tempNum % BASE)]
		tempNum /= BASE
	}

	;[resultArray[3], resultArray[9]] = [resultArray[9], resultArray[3]]
	;[resultArray[4], resultArray[7]] = [resultArray[7], resultArray[4]]

	return resultArray.join('')
}

export function getCsrfToken(): Result<string, BilibiliApiError> {
	const cookieList = useAppStore.getState().bilibiliCookie
	if (!cookieList)
		return err(
			new BilibiliApiError({
				message: '未找到 Cookie',
				type: 'NoCookie',
			}),
		)
	const csrfToken = cookieList.bili_jct as string | undefined
	if (!csrfToken) {
		return err(
			new BilibiliApiError({
				message: '未找到 CSRF Token',
				type: 'CsrfError',
			}),
		)
	}
	return ok(csrfToken)
}
