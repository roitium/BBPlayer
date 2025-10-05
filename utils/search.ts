import { bilibiliApi } from '@/lib/api/bilibili/api'
import { av2bv } from '@/lib/api/bilibili/utils'
import type { RootStackParamList } from '@/types/navigation'
import log, { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

const logger = log.extend('Utils.Search')

const BV_REGEX = /(?<![A-Za-z0-9])(bv[0-9A-Za-z]{10})(?![A-Za-z0-9])/i
const AV_REGEX = /(?<![A-Za-z0-9])av(\d+)(?![A-Za-z0-9])/i
const SPACE_REGEX = /^\/space\/(\d+)(?:\/|$)/i

const cleanUrl = (s: string) => s.replace(/[),.;!?，。！？）]+$/, '')
const ensureProtocol = (s: string) =>
	/^https?:\/\//i.test(s) ? s : 'https://' + s
const removeBilibiliShareTrashContents = (s: string) => {
	const i = s.search(/https?:\/\//i)
	return i >= 0 ? s.slice(i) : s
}

export type SearchStrategy =
	| { type: 'BVID'; bvid: string }
	| { type: 'FAVORITE'; id: string }
	| { type: 'COLLECTION'; id: string }
	| { type: 'SEARCH'; query: string }
	| { type: 'INVALID_URL_NO_CTYPE' }
	| { type: 'B23_RESOLVE_ERROR'; query: string; error: Error }
	| { type: 'B23_NO_BVID_ERROR'; query: string; resolvedUrl: string }
	| { type: 'AV_PARSE_ERROR'; query: string }
	| { type: 'UPLOADER'; mid: string } // 新增策略：作者/空间 mid

/**
 * （伪）OmniBox，用于根据用户输入内容匹配对应的入口
 * @param raw 用户输入的内容
 * @returns 匹配到的策略
 */
export async function matchSearchStrategies(
	raw: string,
): Promise<SearchStrategy> {
	const query = raw.trim()

	const parseUrlToStrategy = (urlObj: URL): SearchStrategy | null => {
		// 1) 处理 ctype+fid（收藏夹）
		const ctype = urlObj.searchParams.get('ctype')
		const fid = urlObj.searchParams.get('fid')
		if (ctype && fid) {
			if (ctype === '21') {
				logger.debug('parseUrlToStrategy: 主站收藏夹 URL (ctype=21)', { fid })
				return { type: 'COLLECTION', id: fid }
			} else if (ctype === '11') {
				logger.debug('parseUrlToStrategy: 主站收藏夹 URL (ctype=11)', { fid })
				return { type: 'FAVORITE', id: fid }
			}
		} else if (fid && !ctype) {
			logger.debug(
				'parseUrlToStrategy: 主站 URL 缺少 ctype 参数，默认为收藏夹',
				{ fid },
			)
			return { type: 'FAVORITE', id: fid }
		}

		// 2) 提取 mid（个人空间、作者页）—— /space/<mid> | space.bilibili.com/<mid>
		const pathname = urlObj.pathname || ''
		const spaceMatch = SPACE_REGEX.exec(pathname)
		if (spaceMatch) {
			const mid = spaceMatch[1]
			logger.debug('parseUrlToStrategy: 匹配 space/<mid>', { mid })
			return { type: 'UPLOADER', mid }
		}
		if (urlObj.hostname === 'space.bilibili.com') {
			const mid = urlObj.pathname.slice(1)
			logger.debug('parseUrlToStrategy: 匹配 space.bilibili.com/<mid>', { mid })
			return { type: 'UPLOADER', mid }
		}

		// 3) 如果 URL 上包含 BV/AV，直接提取
		const bvidInUrl = BV_REGEX.exec(urlObj.href)?.[1]
		if (bvidInUrl) {
			const bvid = 'BV' + bvidInUrl.slice(2)
			logger.debug('parseUrlToStrategy: URL 中匹配到 BV', { bvid })
			return { type: 'BVID', bvid }
		}
		const mAV = AV_REGEX.exec(urlObj.href)
		if (mAV) {
			const avid = Number(mAV[1])
			if (Number.isFinite(avid) && avid > 0) {
				const bvid = av2bv(avid)
				logger.debug('parseUrlToStrategy: URL 中匹配到 AV', { avid, bvid })
				return { type: 'BVID', bvid }
			} else {
				logger.debug('parseUrlToStrategy: URL 中 AV 解析失败', {
					href: urlObj.href,
				})
				return { type: 'AV_PARSE_ERROR', query: urlObj.href }
			}
		}

		// 未识别为已知的主站 URL 类型
		return null
	}

	// 1. 处理 b23.tv 短链（解析后把解析结果当作完整 URL 再走一次完整解析）
	if (query) {
		try {
			const url = new URL(
				ensureProtocol(cleanUrl(removeBilibiliShareTrashContents(query))),
			)

			// 1.1 如果是 b23.tv 短链的话，去解析并把解析结果当作完整 URL 继续解析
			if (/(^|\.)b23\.tv$/i.test(url.hostname)) {
				const resolved = await bilibiliApi.getB23ResolvedUrl(url.toString())
				if (resolved.isErr()) {
					logger.debug('1.1 短链解析失败', { query })
					return { type: 'B23_RESOLVE_ERROR', query, error: resolved.error }
				}

				try {
					const resolvedUrlObj = new URL(resolved.value)
					const parsed = parseUrlToStrategy(resolvedUrlObj)
					if (parsed) {
						logger.debug('1.1 短链解析并作为完整 URL 继续解析', {
							original: url.toString(),
							resolved: resolved.value,
							strategy: parsed.type,
						})
						return parsed
					}
				} catch (_e) {
					// 继续后面检查一下 Bvid
				}

				const bvid = BV_REGEX.exec(resolved.value)?.[1]
				if (bvid) {
					const normalized = 'BV' + bvid.slice(2)
					logger.debug('1.1 短链解析后在 resolved 字符串中匹配到 BV', {
						bvid: normalized,
					})
					return { type: 'BVID', bvid: normalized }
				}

				logger.debug('1.1 短链解析出错（无已识别内容）', {
					original: url.toString(),
					resolved: resolved.value,
				})
				return {
					type: 'B23_NO_BVID_ERROR',
					query,
					resolvedUrl: resolved.value,
				}
			}

			// 1.2 对于主站 url（用户直接粘贴的长链接），尝试解析为各种策略
			const fromUrl = parseUrlToStrategy(url)
			if (fromUrl) {
				logger.debug('1.2 匹配主站 URL', {
					href: url.toString(),
					strategy: fromUrl.type,
				})
				return fromUrl
			}

			// 如果没有返回（未识别的长链），继续走 BV/AV 检测或关键词搜索
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
			logger.debug('Navigating to PlaylistFavorite', { id: strategy.id })
			navigation.navigate('PlaylistFavorite', { id: strategy.id })
			return 0
		case 'COLLECTION':
			logger.debug('Navigating to PlaylistCollection', { id: strategy.id })
			navigation.navigate('PlaylistCollection', { id: strategy.id })
			return 0
		case 'UPLOADER':
			logger.debug('Navigating to PlaylistUploader', { mid: strategy.mid })
			navigation.navigate('PlaylistUploader', { mid: strategy.mid })
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
				'未能从短链解析出已识别内容（BV/作者/收藏等）',
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
