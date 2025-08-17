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

/**
 * （伪）OmniBox，用于根据用户输入内容匹配对应的入口
 * @param raw 用户输入的内容
 * @param navigation react navigation 导航实例
 * @returns 0、1 都表示成功：其中 0 表示匹配策略为 id/url 等，不需要添加到历史记录；1 表示为正常搜索，需要添加到历史记录
 */
export async function matchSearchStrategies(
	raw: string,
	navigation: NativeStackNavigationProp<RootStackParamList>,
) {
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
					toastAndLogError(
						'解析 b23.tv 短链接失败',
						resolved.error,
						'Utils.Search',
					)
					logger.debug('1.1 短链解析失败，走搜索', { query })
					navigation.navigate('SearchResult', { query })
					return 1
				}
				const bvid = BV_REGEX.exec(resolved.value)?.[1]
				if (!bvid) {
					toastAndLogError(
						'未能从短链解析出 bvid',
						new Error(resolved.value),
						'Utils.Search',
					)
					logger.debug('1.1 短链解析出错（无BV号），走搜索', {
						query,
					})
					navigation.navigate('SearchResult', { query })
					return 1
				}
				logger.debug('1.1 匹配 b23.tv 短链，跳 PlaylistMultipage', { bvid })
				navigation.navigate('PlaylistMultipage', { bvid })
				return 0
			}
			// 1.2 对于主站 url，尝试获取 ctype & favId
			const ctype = url.searchParams.get('ctype')
			const fid = url.searchParams.get('fid')
			if (ctype && fid) {
				if (ctype === '21') {
					logger.debug('1.2 匹配主站收藏夹 URL (ctype=21)', {
						fid,
					})
					navigation.navigate('PlaylistCollection', { id: fid })
				} else if (ctype === '11') {
					logger.debug('1.2 匹配主站收藏夹 URL (ctype=11)', {
						fid,
					})
					navigation.navigate('PlaylistFavorite', { id: fid })
				}
				return 0
			} else if (fid && !ctype) {
				toast.error('链接中未找到 ctype 参数，你确定复制全了吗？')
				logger.debug('1.2 主站 URL 缺少 ctype 参数', { fid })
				return 0
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
		navigation.navigate('PlaylistMultipage', { bvid })
		return 0
	}

	// 3. 任意位置提取 AV
	const mAV = AV_REGEX.exec(query)
	if (mAV) {
		const avid = Number(mAV[1])
		if (Number.isFinite(avid) && avid > 0) {
			const bvid = av2bv(avid)
			logger.debug('3 匹配 AV 号', { avid, bvid })
			navigation.navigate('PlaylistMultipage', { bvid })
			return 0
		} else {
			toastAndLogError('解析 avid 失败', new Error(query), 'Utils.Search')
			logger.debug('3 AV 号解析失败，走搜索', { query })
			navigation.navigate('SearchResult', { query })
			return 1
		}
	}

	// 4. 走关键词搜索
	logger.debug('4 默认关键词搜索', { query })
	navigation.navigate('SearchResult', { query })
	return 1
}
