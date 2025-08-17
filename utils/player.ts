import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { BilibiliApiError, BilibiliApiErrorType } from '@/lib/errors/bilibili'
import { AudioUrlNotFoundError, UnknownSourceError } from '@/lib/errors/player'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { RNTPTrack } from '@/types/rntp'
import { err, ok, type Result } from 'neverthrow'
import log from './log'

const logger = log.extend('Player.Utils')

// 音频流过期时间 120 分钟
const STREAM_EXPIRY_TIME = 120 * 60 * 1000

/**
 * 将内部 Track 类型转换为 react-native-track-player 的 Track 类型。
 * @param track - 内部 Track 对象。
 * @returns 一个 Result 对象，成功时包含 RNTPTrack，失败时包含 Error。
 */
function convertToRNTPTrack(
	track: Track,
): Result<RNTPTrack, AudioUrlNotFoundError | BilibiliApiError> {
	logger.debug('转换 Track 为 RNTPTrack', {
		trackId: track.id,
		title: track.title,
		artist: track.artist,
	})

	let url = ''
	if (track.source === 'bilibili' && track.bilibiliMetadata.bilibiliStreamUrl) {
		url = track.bilibiliMetadata.bilibiliStreamUrl.url
		logger.debug('使用 B 站音频流 URL', {
			quality: track.bilibiliMetadata.bilibiliStreamUrl.quality,
		})
	} else if (track.source === 'local' && track.localMetadata) {
		url = track.localMetadata.localPath
		logger.debug('使用本地音频流 URL', { url })
	}

	// 如果没有有效的 URL，返回错误
	if (!url) {
		const errorMsg = '没有找到有效的音频流 URL'
		logger.warning(`${errorMsg}`, track)
		return err(new AudioUrlNotFoundError(`${errorMsg}: ${track.id}`))
	}

	const rnTrack: RNTPTrack = {
		id: track.id,
		url,
		title: track.title,
		artist: track.artist?.name,
		artwork: track.coverUrl ?? undefined,
		duration: track.duration,
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
		headers: {
			referer: 'https://www.bilibili.com',
		},
	}

	logger.debug('RNTPTrack 转换完成', {
		title: rnTrack.title,
		id: rnTrack.id,
	})
	return ok(rnTrack) // 使用 ok 包装成功结果
}

/**
 * 检查 Bilibili 音频流是否过期。
 * @param track - 内部 Track 对象。
 * @returns 如果音频流不存在或已过期，则返回 true，否则返回 false。
 */
function checkBilibiliAudioExpiry(_track: Track): boolean {
	const now = Date.now()
	const track = _track as BilibiliTrack
	const isExpired =
		!track.bilibiliMetadata.bilibiliStreamUrl ||
		now - track.bilibiliMetadata.bilibiliStreamUrl.getTime > STREAM_EXPIRY_TIME
	logger.debug('检查 B 站音频流过期状态', {
		trackId: track.id,
		hasStream: !!track.bilibiliMetadata.bilibiliStreamUrl,
		// streamAge: track.bilibiliStreamUrl ? now - track.bilibiliStreamUrl.getTime : 'N/A',
		isExpired,
		// expiryTime: STREAM_EXPIRY_TIME,
	})
	return isExpired
}

/**
 * 检查并可能更新 Track 的音频流
 * @param track - 内部 Track 对象。
 * @returns 一个 Promise，解析为一个 Result 对象。
 * 成功时包含 { track: Track; needsUpdate: boolean }，
 * 失败时包含 Error。
 */
async function checkAndUpdateAudioStream(
	track: Track,
): Promise<
	Result<
		{ track: Track; needsUpdate: boolean },
		BilibiliApiError | UnknownSourceError
	>
> {
	logger.debug('开始检查并更新音频流', {
		trackId: track.id,
		title: track.title,
	})

	if (track.source === 'local') {
		logger.debug('本地音频，无需更新流', { trackId: track.id })
		return ok({ track, needsUpdate: false })
	}

	if (track.source === 'bilibili') {
		const needsUpdate = checkBilibiliAudioExpiry(track)

		if (!needsUpdate) {
			return ok({ track, needsUpdate: false }) // 流有效，返回 ok
		}

		logger.debug('需要更新 B 站音频流', { trackId: track.id })
		const bvid = track.bilibiliMetadata.bvid
		let cid = track.bilibiliMetadata.cid

		// 获取 CID (如果需要)
		if (!cid) {
			logger.debug('尝试获取视频分 P 列表以确定 CID', { bvid })
			const pageListResult = await bilibiliApi.getPageList(bvid)

			// 使用 match 处理 Result
			const cidResult = pageListResult.match<Result<number, BilibiliApiError>>(
				(pages) => {
					if (pages.length > 0) {
						const firstPageCid = pages[0].cid
						logger.debug('使用第一个分 P 的 CID', {
							bvid,
							cid: firstPageCid,
						})
						return ok(firstPageCid)
					}
					logger.debug('警告：视频没有分 P 信息，无法获取 CID', {
						bvid,
					})
					return err(
						new BilibiliApiError({
							message: `视频 ${bvid} 没有分 P 信息`,
							rawData: pages,
							type: BilibiliApiErrorType.AudioStreamError,
						}),
					)
				},
				(error) => {
					error.message = `获取视频分 P 列表失败: ${error.message}`
					return err(error)
				},
			)

			// 如果获取 CID 失败，则返回错误
			if (cidResult.isErr()) {
				return err(cidResult.error)
			}
			cid = cidResult.value // 获取 CID 成功
		} else {
			logger.debug('使用已有的 CID', { bvid, cid })
		}

		// 3.2 获取新的音频流
		logger.debug('开始获取新的音频流', { bvid, cid })
		const streamUrlResult = await bilibiliApi.getAudioStream({
			bvid,
			cid: cid, // cid 此时一定有值
			audioQuality: 30280,
			enableDolby: true,
			enableHiRes: true,
		})

		// 使用 match 处理获取音频流的 Result
		return streamUrlResult.match<
			Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError>
		>(
			(streamInfo) => {
				if (!streamInfo?.url) {
					const errorMsg = `${track.bilibiliMetadata.bvid} 获取音频流成功但没有有效的 URL`
					// playerLog.sentry(errorMsg, { streamInfo, bvid, cid })
					return err(
						new BilibiliApiError({
							message: errorMsg,
							type: BilibiliApiErrorType.AudioStreamError,
							rawData: streamInfo,
						}),
					) // 返回错误
				}

				logger.debug('音频流获取成功', {
					bvid,
					cid,
					// url: streamInfo.url,
					quality: streamInfo.quality,
					type: streamInfo.type,
				})

				// 更新 track 对象
				const updatedTrack = {
					...track,
					bilibiliMetadata: {
						...track.bilibiliMetadata,
						cid: cid, // 确保 cid 更新
						bilibiliStreamUrl: {
							url: streamInfo.url,
							quality: streamInfo.quality || 0,
							getTime: Date.now(),
							type: streamInfo.type || 'dash',
						},
					},
				}

				return ok({ track: updatedTrack, needsUpdate: true })
			},
			(error) => {
				error.message = `获取音频流失败: ${error.message}`
				return err(error)
			},
		)
	}
	return err(
		new UnknownSourceError(`未知的 Track source: ${(track as Track).source}`),
	)
}

/**
 * 上报播放记录
 * 由于这只是一个非常边缘的功能，我们不关心他是否出错，所以发生报错时只写个 log，返回 void
 */
async function reportPlaybackHistory(track: Track): Promise<void> {
	if (!useAppStore.getState().settings.sendPlayHistory) return
	if (!useAppStore.getState().hasBilibiliCookie()) return
	if (
		track.source !== 'bilibili' ||
		!track.bilibiliMetadata.cid ||
		!track.bilibiliMetadata.bvid
	)
		return
	logger.debug('上报播放记录', {
		bvid: track.bilibiliMetadata.bvid,
		cid: track.bilibiliMetadata.cid,
	})
	const result = await bilibiliApi.reportPlaybackHistory(
		track.bilibiliMetadata.bvid,
		track.bilibiliMetadata.cid,
	)
	if (result.isErr()) {
		logger.warning('上报播放记录到 bilibili 失败', {
			params: {
				bvid: track.bilibiliMetadata.bvid,
				cid: track.bilibiliMetadata.cid,
			},
			error: result.error,
		})
	}
	return
}

export {
	checkAndUpdateAudioStream,
	checkBilibiliAudioExpiry,
	convertToRNTPTrack,
	reportPlaybackHistory,
}
