import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import useAppStore from '@/hooks/stores/useAppStore'
import {
	type BilibiliAudioStreamParams,
	type BilibiliAudioStreamResponse,
	type BilibiliCollection,
	type BilibiliCollectionAllContents,
	type BilibiliCollectionInfo,
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
import type { Playlist, Track } from '@/types/core/media'
import {
	ApiCallingError,
	AudioStreamError,
	BilibiliApiError,
	BilibiliApiErrorType,
	CsrfError,
} from '@/utils/errors'
import log from '@/utils/log'
import { bilibiliApiClient } from './bilibili.client'
import {
	transformCollectionAllContentsToTracks,
	transformFavoriteContentsToTracks,
	transformFavoriteListsToPlaylists,
	transformHistoryVideosToTracks,
	transformHotSearches,
	transformSearchResultsToTracks,
	transformVideoDetailsToTracks,
} from './bilibili.transformers'
import { bv2av, convertToFormDataString } from './bilibili.utils'
import getWbiEncodedParams from './bilibili.wbi'

const bilibiliApiLog = log.extend('BILIBILI_API/API')

/**
 * 创建B站API客户端
 */
export const createBilibiliApi = () => ({
	/**
	 * 获取用户观看历史记录
	 */
	getHistory(): ResultAsync<Track[], BilibiliApiError> {
		return bilibiliApiClient
			.get<BilibiliHistoryVideo[]>('/x/v2/history', undefined)
			.map(transformHistoryVideosToTracks)
	},

	/**
	 * 获取分区热门视频
	 */
	getPopularVideos(partition: string): ResultAsync<Track[], BilibiliApiError> {
		return bilibiliApiClient
			.get<{ list: BilibiliVideoDetails[] }>(
				`/x/web-interface/ranking/v2?rid=${partition}`,
				undefined,
			)
			.map((response) => transformVideoDetailsToTracks(response.list))
	},

	/**
	 * 获取用户收藏夹列表
	 */
	getFavoritePlaylists(
		userMid: number,
	): ResultAsync<Playlist[], BilibiliApiError> {
		return bilibiliApiClient
			.get<{ list: BilibiliPlaylist[] | null }>(
				`/x/v3/fav/folder/created/list-all?up_mid=${userMid}`,
				undefined,
			)
			.map((response) => transformFavoriteListsToPlaylists(response.list))
	},

	/**
	 * 搜索视频
	 */
	searchVideos(
		keyword: string,
		page: number,
		page_size: number,
	): ResultAsync<{ tracks: Track[]; numPages: number }, BilibiliApiError> {
		return bilibiliApiClient
			.get<{
				result: BilibiliSearchVideo[]
				numPages: number
			}>('/x/web-interface/wbi/search/type', {
				keyword,
				search_type: 'video',
				page: page.toString(),
				page_size: page_size.toString(),
			})
			.map((response) => ({
				tracks: transformSearchResultsToTracks(response.result),
				numPages: response.numPages,
			}))
	},

	/**
	 * 获取热门搜索关键词
	 */
	getHotSearches(): ResultAsync<
		{ id: string; text: string }[],
		BilibiliApiError
	> {
		return bilibiliApiClient
			.get<{
				trending: { list: BilibiliHotSearch[] }
			}>('/x/web-interface/search/square', {
				limit: '10',
			})
			.map((response) => transformHotSearches(response.trending.list))
	},

	/**
	 * 获取视频音频流信息
	 */
	getAudioStream(
		params: BilibiliAudioStreamParams,
	): ResultAsync<Track['biliStreamUrl'], ApiCallingError> {
		const { bvid, cid, audioQuality, enableDolby, enableHiRes } = params
		return bilibiliApiClient
			.get<BilibiliAudioStreamResponse>('/x/player/wbi/playurl', {
				bvid,
				cid: String(cid),
				fnval: '16', // 16 表示 dash 格式
				fnver: '0',
				fourk: '1',
				qlt: String(audioQuality),
			})
			.andThen((response) => {
				const { dash } = response

				if (enableHiRes && dash?.hiRes?.audio) {
					bilibiliApiLog.debug('优先使用 Hi-Res 音频流')
					return okAsync({
						url: dash.hiRes.audio.baseUrl,
						quality: dash.hiRes.audio.id,
						getTime: Date.now() + 60 * 1000, // Add 60s buffer
						type: 'dash' as const,
					})
				}

				if (enableDolby && dash?.dolby?.audio && dash.dolby.audio.length > 0) {
					bilibiliApiLog.debug('优先使用 Dolby 音频流')
					return okAsync({
						url: dash.dolby.audio[0].baseUrl,
						quality: dash.dolby.audio[0].id,
						getTime: Date.now() + 60 * 1000, // Add 60s buffer
						type: 'dash' as const,
					})
				}

				if (!dash?.audio || dash.audio.length === 0) {
					bilibiliApiLog.error('未找到有效的音频流数据', { response })
					return errAsync(new AudioStreamError('未找到有效的音频流数据'))
				}

				let stream: Track['biliStreamUrl'] | null = null
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
					bilibiliApiLog.debug('找到指定质量音频流', { quality: audioQuality })
				} else {
					// Fallback: 使用最高质量如果未找到指定质量
					bilibiliApiLog.warn('未找到指定质量音频流，使用最高质量', {
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
					bilibiliApiLog.error('未能确定任何可用的音频流', { response })
					return errAsync(new AudioStreamError('未能确定任何可用的音频流'))
				}

				return okAsync(stream)
			})
			.mapErr((e) => {
				if (e instanceof AudioStreamError) {
					return e
				}
				return new AudioStreamError(
					`获取音频流失败: ${e instanceof Error ? e.message : String(e)}`,
				)
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
	 * （目前采用请求「用户名片信息」接口实现，因为获取个人信息的接口需要 Wbi 鉴权，我还没实现）
	 */
	getOtherUserInfo(
		mid: number,
	): ResultAsync<BilibiliUserInfo, BilibiliApiError> {
		const params = getWbiEncodedParams({
			mid: mid.toString(),
		})
		if (!params) {
			return errAsync(
				new BilibiliApiError(
					'未设置 bilibili Cookie，请先登录',
					0,
					null,
					BilibiliApiErrorType.NoCookie,
				),
			)
		}
		return params.andThen((params) => {
			return bilibiliApiClient.get<BilibiliUserInfo>(
				'/x/space/wbi/acc/info',
				params,
			)
		})
	},

	/**
	 * 获取收藏夹内容(分页)
	 */
	getFavoriteListContents(
		favoriteId: number,
		pn: number,
	): ResultAsync<
		{
			tracks: Track[]
			hasMore: boolean
			favoriteMeta: BilibiliFavoriteListContents['info']
		},
		BilibiliApiError
	> {
		return bilibiliApiClient
			.get<BilibiliFavoriteListContents>('/x/v3/fav/resource/list', {
				media_id: favoriteId.toString(),
				pn: pn.toString(),
				ps: '40',
			})
			.map((response) => ({
				tracks: transformFavoriteContentsToTracks(response.medias),
				hasMore: response.has_more,
				favoriteMeta: response.info,
			}))
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
	): ResultAsync<
		{
			tracks: Track[]
			hasMore: boolean
			favoriteMeta: BilibiliFavoriteListContents['info']
		},
		BilibiliApiError
	> {
		return bilibiliApiClient
			.get<BilibiliFavoriteListContents>('/x/v3/fav/resource/list', {
				media_id: favoriteId.toString(),
				pn: pn.toString(),
				ps: '40',
				keyword,
				type: scope === 'this' ? '0' : '1',
			})
			.map((response) => ({
				tracks: transformFavoriteContentsToTracks(response.medias),
				hasMore: response.has_more,
				favoriteMeta: response.info,
			}))
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
	): ResultAsync<0, ApiCallingError> {
		const resourcesIds = bvids.map((bvid) => `${bv2av(bvid)}:2`)

		const csrfToken = useAppStore
			.getState()
			.bilibiliCookieList.find((cookie) => cookie.name === 'bili_jct')?.value

		if (!csrfToken) {
			return errAsync(new CsrfError('未找到 CSRF Token'))
		}

		const data = {
			resources: resourcesIds.join(','),
			media_id: String(favoriteId),
			platform: 'web',
			csrf: csrfToken,
		}

		bilibiliApiLog.debug('批量删除收藏', new URLSearchParams(data).toString())

		return bilibiliApiClient.post<0>(
			'/x/v3/fav/resource/batch-del',
			convertToFormDataString(data),
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
	): ResultAsync<
		{ info: BilibiliCollectionInfo; medias: Track[] },
		BilibiliApiError
	> {
		return bilibiliApiClient
			.get<BilibiliCollectionAllContents>('/x/space/fav/season/list', {
				season_id: collectionId.toString(),
				ps: '20', // Page size, adjust if needed
				pn: '1', // Start from page 1
			})
			.map((response) => {
				return {
					info: response.info,
					medias: transformCollectionAllContentsToTracks(response.medias),
				}
			})
	},

	/**
	 * 单个视频添加/删除到多个收藏夹
	 */
	dealFavoriteForOneVideo: (
		bvid: string,
		addToFavoriteIds: string[],
		delInFavoriteIds: string[],
	): ResultAsync<BilibiliDealFavoriteForOneVideoResponse, ApiCallingError> => {
		const avid = bv2av(bvid)
		const addToFavoriteIdsCombined = addToFavoriteIds.join(',')
		const delInFavoriteIdsCombined = delInFavoriteIds.join(',')
		const csrfToken = useAppStore
			.getState()
			.bilibiliCookieList.find((cookie) => cookie.name === 'bili_jct')?.value

		if (!csrfToken) {
			return errAsync(new CsrfError('未找到 CSRF Token'))
		}
		const data = {
			rid: String(avid),
			add_media_ids: addToFavoriteIdsCombined,
			del_media_ids: delInFavoriteIdsCombined,
			csrf: csrfToken,
			type: '2',
		}
		return bilibiliApiClient.post<BilibiliDealFavoriteForOneVideoResponse>(
			'/x/v3/fav/resource/deal',
			convertToFormDataString(data),
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
	): ResultAsync<0, ApiCallingError> => {
		const avid = bv2av(bvid)
		const csrfToken = useAppStore
			.getState()
			.bilibiliCookieList.find((cookie) => cookie.name === 'bili_jct')?.value
		if (!csrfToken) {
			return errAsync(new CsrfError('未找到 CSRF Token'))
		}
		const data = {
			aid: String(avid),
			cid: String(cid),
			progress: '0', // 咱们只是为了上报播放记录，而非具体进度
			csrf: csrfToken,
		}
		return bilibiliApiClient.post<0>(
			'/x/v2/history/report',
			convertToFormDataString(data),
		)
	},

	/**
	 * 查询用户投稿视频明细
	 */
	getUserUploadedVideos: (
		mid: number,
		pn: number,
	): ResultAsync<BilibiliUserUploadedVideosResponse, ApiCallingError> => {
		const params = getWbiEncodedParams({
			mid: mid.toString(),
			pn: pn.toString(),
			ps: '30',
		})
		if (!params) {
			return errAsync(
				new BilibiliApiError(
					'未设置 bilibili Cookie，请先登录',
					0,
					null,
					BilibiliApiErrorType.NoCookie,
				),
			)
		}
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
		ApiCallingError
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
		ApiCallingError
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
				throw new BilibiliApiError(
					`请求 bilibili API 失败: ${response.status} ${response.statusText}`,
					response.status,
					null,
					BilibiliApiErrorType.RequestFailed,
				)
			}
			const data: { data: { code: number }; code: number } =
				await response.json()
			bilibiliApiLog.debug('获取二维码登录状态响应数据', data)
			if (data.code !== 0) {
				throw new BilibiliApiError(
					`获取二维码登录状态失败: ${data.code}`,
					data.code,
					data,
					BilibiliApiErrorType.ResponseFailed,
				)
			}
			if (
				data.data.code !== BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS
			) {
				return {
					status: data.data.code as BilibiliQrCodeLoginStatus,
					cookies: '',
				}
			}
			const combinedCookieHeader = response.headers.get('Set-Cookie')
			if (!combinedCookieHeader) {
				throw new BilibiliApiError(
					'未获取到 Set-Cookie 头信息',
					0,
					null,
					BilibiliApiErrorType.ResponseFailed,
				)
			}
			return {
				status: BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS,
				cookies: combinedCookieHeader,
			}
		}

		return ResultAsync.fromPromise(reqFunction(), (error) => {
			if (error instanceof ApiCallingError) {
				return error
			}
			return new BilibiliApiError(
				error instanceof Error ? error.message : String(error),
				0,
				null,
				BilibiliApiErrorType.ResponseFailed,
			)
		})
	},
})

export const bilibiliApi = createBilibiliApi()
