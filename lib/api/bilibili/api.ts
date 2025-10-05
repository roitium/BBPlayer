import { useAppStore } from '@/hooks/stores/useAppStore'
import { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import type { BilibiliSearchSuggestionItem } from '@/types/apis/bilibili'
import {
	type BilibiliAudioStreamParams,
	type BilibiliAudioStreamResponse,
	type BilibiliCollection,
	type BilibiliCollectionAllContents,
	type BilibiliDealFavoriteForOneVideoResponse,
	type BilibiliFavoriteListAllContents,
	type BilibiliFavoriteListContents,
	type BilibiliHistoryVideo,
	type BilibiliHotSearch,
	type BilibiliMultipageVideo,
	type BilibiliPlaylist,
	BilibiliQrCodeLoginStatus,
	type BilibiliSearchVideo,
	type BilibiliUserInfo,
	type BilibiliUserUploadedVideosResponse,
	type BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { BilibiliTrack } from '@/types/core/media'
import log from '@/utils/log'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { bilibiliApiClient } from './client'
import { bv2av, getCsrfToken } from './utils'
import getWbiEncodedParams from './wbi'

const logger = log.extend('3Party.Bilibili.Api')

/**
 * 创建B站API客户端
 */
export const createBilibiliApi = () => ({
	/**
	 * 获取用户观看历史记录
	 */
	getHistory(): ResultAsync<BilibiliHistoryVideo[], BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliHistoryVideo[]>(
			'/x/v2/history',
			undefined,
		)
	},

	/**
	 * 获取分区热门视频
	 */
	getPopularVideos(
		partition: string,
	): ResultAsync<BilibiliVideoDetails[], BilibiliApiError> {
		return bilibiliApiClient
			.get<{
				list: BilibiliVideoDetails[]
			}>(`/x/web-interface/ranking/v2?rid=${partition}`, undefined)
			.map((response) => response.list)
	},

	/**
	 * 获取用户收藏夹列表
	 */
	getFavoritePlaylists(
		userMid: number,
	): ResultAsync<BilibiliPlaylist[], BilibiliApiError> {
		return bilibiliApiClient
			.get<{
				list: BilibiliPlaylist[] | null
			}>(`/x/v3/fav/folder/created/list-all?up_mid=${userMid}`, undefined)
			.map((response) => response.list)
			.map((list) => list ?? [])
	},

	/**
	 * 搜索视频
	 */
	searchVideos(
		keyword: string,
		page: number,
	): ResultAsync<
		{ result: BilibiliSearchVideo[]; numPages: number },
		BilibiliApiError
	> {
		const params = getWbiEncodedParams({
			keyword,
			search_type: 'video',
			page: page.toString(),
		})

		return params
			.andThen((params) => {
				return bilibiliApiClient.get<{
					result: BilibiliSearchVideo[]
					numPages: number
				}>('/x/web-interface/wbi/search/type', params)
			})
			.andThen((res) => {
				if (!res.result) {
					res.result = []
				}
				return okAsync(res)
			})
	},

	/**
	 * 获取热门搜索关键词
	 */
	getHotSearches(): ResultAsync<BilibiliHotSearch[], BilibiliApiError> {
		return bilibiliApiClient
			.get<{
				trending: { list: BilibiliHotSearch[] }
			}>('/x/web-interface/search/square', {
				limit: '10',
			})
			.map((response) => response.trending.list)
	},

	/**
	 * 获取搜索建议
	 */
	getSearchSuggestions(
		term: string,
		signal?: AbortSignal,
	): ResultAsync<BilibiliSearchSuggestionItem[], BilibiliApiError> {
		const params = new URLSearchParams()
		params.append('main_ver', 'v1')
		params.append('term', term)
		const bilibiliCookie = useAppStore.getState().bilibiliCookie
		if (bilibiliCookie?.mid) {
			params.append('userid', bilibiliCookie.mid)
		}
		const url = `https://s.search.bilibili.com/main/suggest?${params.toString()}`

		return ResultAsync.fromPromise(
			fetch(url, {
				method: 'GET',
				signal,
			}),
			(e) => {
				if (e instanceof Error && e.name === 'AbortError') {
					return new BilibiliApiError({
						message: '请求被取消',
						type: 'RequestAborted',
					})
				}
				return new BilibiliApiError({
					message: e instanceof Error ? e.message : String(e),
					type: 'RequestFailed',
				})
			},
		)
			.andThen((response) => {
				if (!response.ok) {
					return errAsync(
						new BilibiliApiError({
							message: `请求 bilibili API 失败: ${response.status} ${response.statusText}`,
							msgCode: response.status,
							type: 'RequestFailed',
						}),
					)
				}
				return ResultAsync.fromPromise(
					response.json() as Promise<{
						code: number
						result: { tag: BilibiliSearchSuggestionItem[] }
					}>,
					(error) =>
						new BilibiliApiError({
							message: error instanceof Error ? error.message : String(error),
							type: 'ResponseFailed',
						}),
				)
			})
			.andThen((data) => {
				if (data.code !== 0) {
					return errAsync(
						new BilibiliApiError({
							message: `获取搜索建议失败: ${data.code}`,
							msgCode: data.code,
							type: 'RequestFailed',
						}),
					)
				}
				return okAsync(data.result.tag)
			})
	},

	/**
	 * 获取视频音频流信息
	 * 优先级（在 dolby 和 hi-res 都开启的情况下）：dolby > hi-res > normal
	 */
	getAudioStream(
		params: BilibiliAudioStreamParams,
	): ResultAsync<
		Exclude<BilibiliTrack['bilibiliMetadata']['bilibiliStreamUrl'], undefined>,
		BilibiliApiError
	> {
		const { bvid, cid, audioQuality, enableDolby, enableHiRes } = params
		const wbiParams = getWbiEncodedParams({
			bvid,
			cid: String(cid),
			fnval: '16', // 16 表示 dash 格式
			fnver: '0',
			fourk: '1',
			qlt: String(audioQuality),
		})

		return wbiParams
			.andThen((params) => {
				return bilibiliApiClient.get<BilibiliAudioStreamResponse>(
					'/x/player/wbi/playurl',
					params,
				)
			})
			.andThen((response) => {
				const { dash } = response

				if (enableDolby && dash?.dolby?.audio && dash.dolby.audio.length > 0) {
					logger.debug('优先使用 Dolby 音频流')
					return okAsync({
						url: dash.dolby.audio[0].baseUrl,
						quality: dash.dolby.audio[0].id,
						getTime: Date.now() + 60 * 1000, // Add 60s buffer
						type: 'dash' as const,
					})
				}

				if (enableHiRes && dash?.flac?.audio) {
					logger.debug('次级使用 Hi-Res 音频流')
					return okAsync({
						url: dash.flac.audio.baseUrl,
						quality: dash.flac.audio.id,
						getTime: Date.now() + 60 * 1000, // Add 60s buffer
						type: 'dash' as const,
					})
				}

				if (!dash?.audio || dash.audio.length === 0) {
					logger.error('未找到有效的音频流数据', { response })
					return errAsync(
						new BilibiliApiError({
							message: '未找到有效的音频流数据',
							type: 'AudioStreamError',
						}),
					)
				}

				let stream:
					| BilibiliTrack['bilibiliMetadata']['bilibiliStreamUrl']
					| null = null
				const getTime = Date.now() + 60 * 1000 // 加 60s 提前量

				// 尝试找到指定质量的音频流
				const targetAudio = dash.audio.find(
					(audio) => audio.id === audioQuality,
				)

				if (targetAudio) {
					stream = {
						url: targetAudio.baseUrl,
						quality: targetAudio.id,
						getTime,
						type: 'dash',
					}
					logger.debug('找到指定质量音频流', { quality: audioQuality })
				} else {
					// Fallback: 使用最高质量如果未找到指定质量
					logger.warning('未找到指定质量音频流，使用最高质量', {
						requestedQuality: audioQuality,
						availableQualities: dash.audio.map((a) => a.id),
					})
					const highestQualityAudio = dash.audio[0]
					if (highestQualityAudio) {
						stream = {
							url: highestQualityAudio.baseUrl,
							quality: highestQualityAudio.id,
							getTime,
							type: 'dash',
						}
					}
				}

				if (!stream) {
					logger.error('未能确定任何可用的音频流', { response })
					return errAsync(
						new BilibiliApiError({
							message: '未能确定任何可用的音频流',
							type: 'AudioStreamError',
						}),
					)
				}

				return okAsync(stream)
			})
	},

	/**
	 * 获取视频分P列表
	 */
	getPageList(
		bvid: string,
	): ResultAsync<BilibiliMultipageVideo[], BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliMultipageVideo[]>(
			'/x/player/pagelist',
			{
				bvid,
			},
		)
	},

	/**
	 * 获取登录本人信息
	 */
	getUserInfo(): ResultAsync<BilibiliUserInfo, BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliUserInfo>('/x/space/myinfo', undefined)
	},

	/**
	 * 获取别人用户信息
	 */
	getOtherUserInfo(mid: number) {
		const params = getWbiEncodedParams({
			mid: mid.toString(),
		})
		return params.andThen((params) => {
			return bilibiliApiClient.get<BilibiliUserInfo>(
				'/x/space/wbi/acc/info',
				params,
				undefined,
			)
		})
	},

	/**
	 * 获取收藏夹内容(分页)
	 */
	getFavoriteListContents(
		favoriteId: number,
		pn: number,
	): ResultAsync<BilibiliFavoriteListContents, BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliFavoriteListContents>(
			'/x/v3/fav/resource/list',
			{
				media_id: favoriteId.toString(),
				pn: pn.toString(),
				ps: '40',
			},
		)
	},

	/**
	 * 搜索收藏夹内容
	 * @param favoriteId 如果是全局搜索，随意提供一个**有效**的收藏夹 ID 即可
	 */
	searchFavoriteListContents(
		favoriteId: number,
		scope: 'all' | 'this',
		pn: number,
		keyword: string,
	): ResultAsync<BilibiliFavoriteListContents, BilibiliApiError> {
		return bilibiliApiClient
			.get<BilibiliFavoriteListContents>('/x/v3/fav/resource/list', {
				media_id: favoriteId.toString(),
				pn: pn.toString(),
				ps: '40',
				keyword,
				type: scope === 'this' ? '0' : '1',
			})
			.andThen((res) => {
				res.medias ??= []
				return okAsync(res)
			})
	},

	/**
	 * 获取收藏夹所有视频内容（仅bvid和类型）
	 * 此接口用于获取收藏夹内所有视频的bvid，常用于批量操作前获取所有目标ID
	 */
	getFavoriteListAllContents(
		favoriteId: number,
	): ResultAsync<BilibiliFavoriteListAllContents, BilibiliApiError> {
		return bilibiliApiClient
			.get<BilibiliFavoriteListAllContents>('/x/v3/fav/resource/ids', {
				media_id: favoriteId.toString(),
			})
			.map((response) => response.filter((item) => item.type === 2)) // 过滤非视频稿件 (type 2 is video)
	},

	/**
	 * 获取视频详细信息
	 */
	getVideoDetails(
		bvid: string,
	): ResultAsync<BilibiliVideoDetails, BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliVideoDetails>(
			'/x/web-interface/view',
			{
				bvid,
			},
		)
	},

	/**
	 * 批量删除收藏夹内容
	 */
	batchDeleteFavoriteListContents(
		favoriteId: number,
		bvids: string[],
	): ResultAsync<0, BilibiliApiError> {
		const resourcesIds = bvids.map((bvid) => `${bv2av(bvid)}:2`)

		const csrfToken = getCsrfToken()
		if (csrfToken.isErr()) return errAsync(csrfToken.error)

		const data = {
			resources: resourcesIds.join(','),
			media_id: String(favoriteId),
			platform: 'web',
			csrf: csrfToken.value,
		}

		logger.debug('批量删除收藏', new URLSearchParams(data).toString())

		return bilibiliApiClient.post<0>(
			'/x/v3/fav/resource/batch-del',
			new URLSearchParams(data).toString(),
		)
	},

	/**
	 * 获取用户追更的视频合集/收藏夹（非用户自己创建的）列表
	 */
	getCollectionsList(
		pageNumber: number,
		mid: number,
	): ResultAsync<
		{ list: BilibiliCollection[]; count: number; hasMore: boolean },
		BilibiliApiError
	> {
		return bilibiliApiClient
			.get<{
				list: BilibiliCollection[]
				count: number
				has_more: boolean
			}>('/x/v3/fav/folder/collected/list', {
				pn: pageNumber.toString(),
				ps: '70', // Page size
				up_mid: mid.toString(),
				platform: 'web',
			})
			.map((response) => ({
				list: response.list ?? [],
				count: response.count,
				hasMore: response.has_more,
			}))
	},

	/**
	 * 获取合集详细信息和完整内容
	 */
	getCollectionAllContents(
		collectionId: number,
	): ResultAsync<BilibiliCollectionAllContents, BilibiliApiError> {
		return bilibiliApiClient.get<BilibiliCollectionAllContents>(
			'/x/space/fav/season/list',
			{
				season_id: collectionId.toString(),
				ps: '20', // Page size, adjust if needed
				pn: '1', // Start from page 1
			},
		)
	},

	/**
	 * 单个视频添加/删除到多个收藏夹
	 */
	dealFavoriteForOneVideo: (
		bvid: string,
		addToFavoriteIds: string[],
		delInFavoriteIds: string[],
	): ResultAsync<BilibiliDealFavoriteForOneVideoResponse, BilibiliApiError> => {
		const avid = bv2av(bvid)
		const addToFavoriteIdsCombined = addToFavoriteIds.join(',')
		const delInFavoriteIdsCombined = delInFavoriteIds.join(',')
		const csrfToken = getCsrfToken()
		if (csrfToken.isErr()) return errAsync(csrfToken.error)

		const data = {
			rid: String(avid),
			add_media_ids: addToFavoriteIdsCombined,
			del_media_ids: delInFavoriteIdsCombined,
			csrf: csrfToken.value,
			type: '2',
		}
		return bilibiliApiClient.post<BilibiliDealFavoriteForOneVideoResponse>(
			'/x/v3/fav/resource/deal',
			new URLSearchParams(data).toString(),
		)
	},

	/**
	 * 获取目标视频的收藏情况
	 */
	getTargetVideoFavoriteStatus(
		userMid: number,
		bvid: string,
	): ResultAsync<BilibiliPlaylist[], BilibiliApiError> {
		const avid = bv2av(bvid)
		return bilibiliApiClient
			.get<{ list: BilibiliPlaylist[] | null }>(
				'/x/v3/fav/folder/created/list-all',
				{
					up_mid: userMid.toString(),
					rid: String(avid),
					type: '2',
				},
			)
			.map((response) => {
				if (!response.list) {
					return []
				}
				return response.list
			})
	},

	/**
	 * 上报观看记录
	 */
	reportPlaybackHistory: (
		bvid: string,
		cid: number,
	): ResultAsync<0, BilibiliApiError> => {
		const avid = bv2av(bvid)
		const csrfToken = getCsrfToken()
		if (csrfToken.isErr()) return errAsync(csrfToken.error)

		const data = {
			aid: String(avid),
			cid: String(cid),
			progress: '0', // 咱们只是为了上报播放记录，而非具体进度
			csrf: csrfToken.value,
		}
		return bilibiliApiClient.post<0>(
			'/x/v2/history/report',
			new URLSearchParams(data).toString(),
		)
	},

	/**
	 * 查询用户投稿视频明细
	 * 可通过 keyword 搜索用户发布的视频
	 */
	getUserUploadedVideos: (
		mid: number,
		pn: number,
		keyword?: string,
	): ResultAsync<BilibiliUserUploadedVideosResponse, BilibiliApiError> => {
		const params = getWbiEncodedParams({
			mid: mid.toString(),
			pn: pn.toString(),
			keyword: keyword ?? '',
			ps: '30',
		})
		return params.andThen((params) => {
			return bilibiliApiClient.get<BilibiliUserUploadedVideosResponse>(
				'/x/space/wbi/arc/search',
				params,
			)
		})
	},

	/**
	 * 申请登录二维码
	 */
	getLoginQrCode: (): ResultAsync<
		{ url: string; qrcode_key: string },
		BilibiliApiError
	> => {
		return bilibiliApiClient.get<{ url: string; qrcode_key: string }>(
			'',
			undefined,
			'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
		)
	},

	/**
	 * 轮询二维码登录状态接口
	 */
	pollQrCodeLoginStatus: (
		qrcode_key: string,
	): ResultAsync<
		{ status: BilibiliQrCodeLoginStatus; cookies: string },
		BilibiliApiError
	> => {
		const reqFunction = async () => {
			const response = await fetch(
				`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`,
				{
					method: 'GET',
					headers: {
						'User-Agent':
							'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
					},
				},
			)
			if (!response.ok) {
				throw new BilibiliApiError({
					message: `请求 bilibili API 失败: ${response.status} ${response.statusText}`,
					msgCode: response.status,
					type: 'RequestFailed',
				})
			}
			const data = (await response.json()) as {
				data: { code: number }
				code: number
			}
			if (data.code !== 0) {
				throw new BilibiliApiError({
					message: `获取二维码登录状态失败: ${data.code}`,
					msgCode: data.code,
					rawData: data,
					type: 'ResponseFailed',
				})
			}
			const code = data.data.code as BilibiliQrCodeLoginStatus
			if (code !== BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS) {
				return {
					status: code,
					cookies: '',
				}
			}
			const combinedCookieHeader = response.headers.get('Set-Cookie')
			if (!combinedCookieHeader) {
				throw new BilibiliApiError({
					message: '未获取到 Set-Cookie 头信息',
					msgCode: 0,
					rawData: null,
					type: 'ResponseFailed',
				})
			}
			return {
				status: BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS,
				cookies: combinedCookieHeader,
			}
		}

		return ResultAsync.fromPromise(reqFunction(), (error) => {
			if (error instanceof BilibiliApiError) {
				return error
			}
			return new BilibiliApiError({
				message: error instanceof Error ? error.message : String(error),
				msgCode: 0,
				rawData: null,
				type: 'ResponseFailed',
			})
		})
	},

	/**
	 * 获取 b23.tv 短链接的解析后结果
	 */
	getB23ResolvedUrl: (
		b23Url: string,
	): ResultAsync<string, BilibiliApiError> => {
		return ResultAsync.fromPromise(
			fetch(b23Url, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
				},
			}),
			(e) =>
				new BilibiliApiError({
					message: (e as Error).message,
					type: 'RequestFailed',
				}),
		).andThen((response) => {
			if (!response.ok) {
				return errAsync(
					new BilibiliApiError({
						message: `请求 b23.tv 短链接失败: ${response.status} ${response.statusText}`,
						msgCode: response.status,
						type: 'RequestFailed',
					}),
				)
			}
			const redirectUrl = response.url // react native 不支持 redirect: 'manual'，所以在这里直接获取最终跳转到的 URL
			if (!redirectUrl) {
				return errAsync(
					new BilibiliApiError({
						message: '未获取到 b23.tv 短链接的解析结果',
						msgCode: 0,
						rawData: null,
						type: 'ResponseFailed',
					}),
				)
			}
			return okAsync(redirectUrl)
		})
	},

	/**
	 * 检查视频是否已经点赞
	 * （文档中说该接口实际查询的是 **近期** 是否被点赞）
	 */
	checkVideoIsThumbUp: (bvid: string) => {
		return bilibiliApiClient.get<0 | 1>('/x/web-interface/archive/has/like', {
			bvid,
		})
	},

	/**
	 * 给视频点赞或取消点赞
	 * @param bvid
	 * @param like true 表示点赞，false 表示取消点赞
	 * @returns 对于重复点赞的错误一律当作成功返回。
	 */
	thumbUpVideo: (
		bvid: string,
		like: boolean,
	): ResultAsync<0, BilibiliApiError> => {
		const csrfToken = getCsrfToken()
		if (csrfToken.isErr()) return errAsync(csrfToken.error)

		const data = {
			bvid,
			like: like ? '1' : '2',
			csrf: csrfToken.value,
		}

		return bilibiliApiClient
			.post<undefined>(
				'/x/web-interface/archive/like',
				new URLSearchParams(data).toString(),
			)
			.andThen(() => {
				return okAsync(0 as const)
			})
			.orElse((err) => {
				switch (err.data.msgCode) {
					case 65006:
						// 重复点赞
						return okAsync(0 as const)
					default:
						return errAsync(err)
				}
			})
	},
})

export const bilibiliApi = createBilibiliApi()
