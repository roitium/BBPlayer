import { bilibiliApi } from '@/lib/api/bilibili/api'
import { av2bv } from '@/lib/api/bilibili/utils'
import type { RootStackParamList } from '@/types/navigation'
import log, { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

const logger = log.extend('Utils.Search')

const BV_REGEX = /(?<![A-Za-z0-9])(bv[0-9A-Za-z]{10})(?![A-Za-z0-9])/i
const AV_REGEX = /(?<![A-Za-z0-9])av(\d+)(?![A-Za-z0-9])/i

const cleanUrl = (s: string) => s.replace(/[),.;!?，。！？）]+$/, '')
const ensureProtocol = (s: string) =>
	/^https?:\/\//i.test(s) ? s : 'https://' + s
const removeBilibiliShareTrashContents = (s: string) => {
	const i = s.search(/https?:\/\//i)
	return i >= 0 ? s.slice(i) : s
}

export type SearchStrategy =
	| { type: 'BVID'; bvid: string }
	| { type: 'FAVORITE'; id: string; ctype: '11' | '21' }
	| { type: 'SEARCH'; query: string }
	| { type: 'INVALID_URL_NO_CTYPE' }
	| { type: 'B23_RESOLVE_ERROR'; query: string; error: Error }
	| { type: 'B23_NO_BVID_ERROR'; query: string; resolvedUrl: string }
	| { type: 'AV_PARSE_ERROR'; query: string }

/**
 * （伪）OmniBox，用于根据用户输入内容匹配对应的入口
 * @param raw 用户输入的内容
 * @returns 匹配到的策略
 */
export async function matchSearchStrategies(
	raw: string,
): Promise<SearchStrategy> {
	const query = raw.trim()

	// 1. 处理 b23.tv 短链（出错就回退到搜索）
	if (query) {
		try {
			const url = new URL(
				ensureProtocol(cleanUrl(removeBilibiliShareTrashContents(query))),
			)
			// 1.1 如果是 b23.tv 短链的话，去解析
			if (/(^|\.)b23\.tv$/i.test(url.hostname)) {
				const resolved = await bilibiliApi.getB23ResolvedUrl(url.toString())
				if (resolved.isErr()) {
					logger.debug('1.1 短链解析失败', { query })
					return { type: 'B23_RESOLVE_ERROR', query, error: resolved.error }
				}
				const bvid = BV_REGEX.exec(resolved.value)?.[1]
				if (!bvid) {
					logger.debug('1.1 短链解析出错（无BV号）', {
						query,
					})
					return {
						type: 'B23_NO_BVID_ERROR',
						query,
						resolvedUrl: resolved.value,
					}
				}
				logger.debug('1.1 匹配 b23.tv 短链', { bvid })
				return { type: 'BVID', bvid }
			}
			// 1.2 对于主站 url，尝试获取 ctype & favId
			const ctype = url.searchParams.get('ctype')
			const fid = url.searchParams.get('fid')
			if (ctype && fid) {
				if (ctype === '21') {
					logger.debug('1.2 匹配主站收藏夹 URL (ctype=21)', {
						fid,
					})
					return { type: 'FAVORITE', id: fid, ctype: '21' }
				} else if (ctype === '11') {
					logger.debug('1.2 匹配主站收藏夹 URL (ctype=11)', {
						fid,
					})
					return { type: 'FAVORITE', id: fid, ctype: '11' }
				}
			} else if (fid && !ctype) {
				logger.debug('1.2 主站 URL 缺少 ctype 参数', { fid })
				return { type: 'INVALID_URL_NO_CTYPE' }
			}
		} catch {
			logger.debug('URL 解析失败，继续走 BV/AV 检测', {
				query,
			})
		}
	}

	// 2. 任意位置提取 BV
	const mBV = BV_REGEX.exec(query)
	if (mBV) {
		const bvid = 'BV' + mBV[1].slice(2)
		logger.debug('2 匹配 BV 号', { bvid })
		return { type: 'BVID', bvid }
	}

	// 3. 任意位置提取 AV
	const mAV = AV_REGEX.exec(query)
	if (mAV) {
		const avid = Number(mAV[1])
		if (Number.isFinite(avid) && avid > 0) {
			const bvid = av2bv(avid)
			logger.debug('3 匹配 AV 号', { avid, bvid })
			return { type: 'BVID', bvid }
		} else {
			logger.debug('3 AV 号解析失败', { query })
			return { type: 'AV_PARSE_ERROR', query }
		}
	}

	// 4. 走关键词搜索
	logger.debug('4 默认关键词搜索', { query })
	return { type: 'SEARCH', query }
}

/**
 * 根据匹配到的策略进行导航
 * @param strategy 匹配到的策略
 * @param navigation react navigation 导航实例
 * @returns 0 表示匹配策略为 id/url 等，不需要添加到历史记录；1 表示为正常搜索，需要添加到历史记录
 */
export function navigateWithSearchStrategy(
	strategy: SearchStrategy,
	navigation: NativeStackNavigationProp<RootStackParamList>,
) {
	switch (strategy.type) {
		case 'BVID':
			logger.debug('Navigating to PlaylistMultipage with bvid', {
				bvid: strategy.bvid,
			})
			navigation.navigate('PlaylistMultipage', { bvid: strategy.bvid })
			return 0
		case 'FAVORITE':
			if (strategy.ctype === '21') {
				logger.debug('Navigating to PlaylistCollection', { id: strategy.id })
				navigation.navigate('PlaylistCollection', { id: strategy.id })
			} else {
				// ctype === '11'
				logger.debug('Navigating to PlaylistFavorite', { id: strategy.id })
				navigation.navigate('PlaylistFavorite', { id: strategy.id })
			}
			return 0
		case 'SEARCH':
			logger.debug('Navigating to SearchResult', { query: strategy.query })
			navigation.navigate('SearchResult', { query: strategy.query })
			return 1
		case 'INVALID_URL_NO_CTYPE':
			toast.error('链接中未找到 ctype 参数，你确定复制全了吗？')
			return 0
		case 'B23_RESOLVE_ERROR':
			toastAndLogError('解析 b23.tv 短链接失败', strategy.error, 'Utils.Search')
			navigation.navigate('SearchResult', { query: strategy.query })
			return 1
		case 'B23_NO_BVID_ERROR':
			toastAndLogError(
				'未能从短链解析出 bvid',
				new Error(strategy.resolvedUrl),
				'Utils.Search',
			)
			navigation.navigate('SearchResult', { query: strategy.query })
			return 1
		case 'AV_PARSE_ERROR':
			toastAndLogError(
				'解析 avid 失败',
				new Error(strategy.query),
				'Utils.Search',
			)
			navigation.navigate('SearchResult', { query: strategy.query })
			return 1
	}
}
