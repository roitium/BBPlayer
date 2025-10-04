import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import type { PlayerError } from '@/lib/errors/player'
import { createPlayerError } from '@/lib/errors/player'
import { BilibiliApiError } from '@/lib/errors/thirdparty/bilibili'
import { trackService } from '@/lib/services/trackService'
import type { BilibiliTrack, Track } from '@/types/core/media'
import type { RNTPTrack } from '@/types/rntp'
import { File, Paths } from 'expo-file-system'
import { produce } from 'immer'
import { err, ok, type Result } from 'neverthrow'
import log from './log'
import toast from './toast'

const logger = log.extend('Utils.Player')

// 音频流过期时间 120 分钟
const STREAM_EXPIRY_TIME = 120 * 60 * 1000

/**
 * 将内部 Track 类型转换为 react-native-track-player 的 Track 类型。
 * @param track - 内部 Track 对象。
 * @returns 一个 Result 对象，成功时包含 RNTPTrack，失败时包含 Error。
 */
function convertToRNTPTrack(
	track: Track,
): Result<RNTPTrack, BilibiliApiError | PlayerError> {
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
		return err(
			createPlayerError('AudioUrlNotFound', `${errorMsg}: ${track.id}`),
		)
	}

	const rnTrack: RNTPTrack = {
		id: track.id,
		url,
		title: track.title,
		artist: track.artist?.name,
		artwork: track.coverUrl ?? undefined,
		duration: track.duration,
		userAgent:
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
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

interface LocalCheckResult {
	track: Track
	handledLocally: boolean
	needsUpdate: boolean
}

/**
 * - 如果 source === 'local'：直接 handledLocally = true
 * - 如果 source === 'bilibili' 且 trackDownloads.status === 'downloaded'：
 *    - 本地文件存在且与当前 streamUrl 匹配 -> handledLocally = true, needsUpdate = false
 *    - 本地文件存在但与当前 streamUrl 不同 -> 返回一个 updatedTrack（指向本地），handledLocally = true, needsUpdate = true
 *    - 本地文件不存在但 DB 标记为 downloaded -> 修正 DB 为 failed、清除 streamUrl，handledLocally = false, needsUpdate = true
 * - 其它情况：handledLocally = false, needsUpdate = false（继续远程检查/获取）
 */
async function tryUseLocalStream(
	track: Track,
): Promise<Result<LocalCheckResult, BilibiliApiError | PlayerError>> {
	logger.debug('尝试检查本地播放可用性', {
		trackId: track.id,
		source: track.source,
	})

	// 1) 真正的本地 source，直接返回（无需后续远程处理）
	if (track.source === 'local') {
		logger.debug('本地音频，无需更新流', { trackId: track.id })
		return ok({ track, handledLocally: true, needsUpdate: false })
	}

	// 2) 仅处理 bilibili 源的“已下载”情况；其它来源不在本函数内处理
	if (track.source !== 'bilibili') {
		logger.debug('非 B 站音源，跳过本地检查', {
			trackId: (track as Track).id,
			source: (track as Track).source,
		})
		return ok({ track, handledLocally: false, needsUpdate: false })
	}

	// source === 'bilibili'
	if (track.trackDownloads && track.trackDownloads.status === 'downloaded') {
		const file = new File(Paths.document, 'downloads', `${track.uniqueKey}.m4s`)

		// 本地文件存在 -> 优先使用本地
		if (file.exists) {
			logger.debug('已下载的音频，本地文件存在，尝试使用本地文件', {
				trackId: track.id,
				path: file.uri,
			})

			// 如果已经指向相同本地 uri，则无需修改
			if (track.bilibiliMetadata.bilibiliStreamUrl?.url === file.uri) {
				return ok({ track, handledLocally: true, needsUpdate: false })
			}

			// 否则把 track 更新为使用本地流（quality / getTime 保持原行为）
			const updatedTrack: Track = {
				...track,
				bilibiliMetadata: {
					...track.bilibiliMetadata,
					bilibiliStreamUrl: {
						url: file.uri,
						quality: 114514,
						getTime: Number.POSITIVE_INFINITY,
						type: 'local' as const,
					},
				},
			}

			logger.debug('将 track 的流切换为本地文件', {
				trackId: track.id,
				path: file.uri,
			})
			return ok({
				track: updatedTrack,
				handledLocally: true,
				needsUpdate: true,
			})
		} else {
			logger.warning(
				'数据库中将该音频标记为已下载，但本地文件不存在，移除数据库标记并尝试从远程获取流',
			)
			toast.error('本地文件不存在，移除数据库下载标记并尝试从网络播放')
			const result = await trackService.createOrUpdateTrackDownloadRecord({
				trackId: track.id,
				status: 'failed',
				fileSize: 0,
			})

			if (result.isErr()) {
				logger.error('删除数据库下载记录失败：', { error: result.error })
			}

			// 修改 track，保证能顺利进入下面的刷新流逻辑
			const updatedTrack = produce(track, (draft) => {
				draft.trackDownloads = {
					status: 'failed',
					fileSize: 0,
					trackId: track.id,
					downloadedAt: Date.now(),
				}
				draft.bilibiliMetadata.bilibiliStreamUrl = undefined
			})

			return ok({
				track: updatedTrack,
				handledLocally: false,
				needsUpdate: true,
			})
		}
	}

	// 没有下载记录，或不是已下载状态：让调用方继续走远程流的过期检查/获取
	return ok({ track, handledLocally: false, needsUpdate: false })
}

/**
 * 先调用 tryUseLocalStream 做本地检查；如果本地已处理完则直接返回；
 * 否则继续原来的 B 站流刷新逻辑（CID 获取 + getAudioStream 等）。
 */
async function checkAndUpdateAudioStream(
	track: Track,
): Promise<
	Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | PlayerError>
> {
	logger.debug('开始检查并更新音频流', {
		trackId: track.id,
		title: track.title,
	})

	// 先把本地播放检查逻辑剥离出去
	const localCheck = await tryUseLocalStream(track)
	if (localCheck.isErr()) {
		return err(localCheck.error)
	}

	const localValue = localCheck.value
	// 使用可能被更新过的 track 继续后续逻辑
	track = localValue.track

	// 若本地已经处理（包含 source === 'local' 情况）则直接返回
	if (localValue.handledLocally) {
		logger.debug('本地检查已处理音频（无需远端刷新）', {
			trackId: track.id,
			needsUpdate: localValue.needsUpdate,
		})
		return ok({ track, needsUpdate: localValue.needsUpdate })
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
							type: 'AudioStreamError',
						}),
					)
				},
				(error) => {
					error.message = `获取视频分 P 列表失败: ${error.message}`
					return err(error)
				},
			)

			if (cidResult.isErr()) {
				return err(cidResult.error)
			}
			cid = cidResult.value
		} else {
			logger.debug('使用已有的 CID', { bvid, cid })
		}

		// 获取新的音频流
		logger.debug('开始获取新的音频流', { bvid, cid })
		const streamUrlResult = await bilibiliApi.getAudioStream({
			bvid,
			cid: cid,
			audioQuality: 30280,
			enableDolby: true,
			enableHiRes: true,
		})

		return streamUrlResult.match<
			Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError>
		>(
			(streamInfo) => {
				if (!streamInfo?.url) {
					const errorMsg = `${track.bilibiliMetadata.bvid} 获取音频流成功但没有有效的 URL`
					return err(
						new BilibiliApiError({
							message: errorMsg,
							type: 'AudioStreamError',
							rawData: streamInfo,
						}),
					)
				}

				logger.debug('音频流获取成功', {
					bvid,
					cid,
					quality: streamInfo.quality,
					type: streamInfo.type,
				})

				const updatedTrack = {
					...track,
					bilibiliMetadata: {
						...track.bilibiliMetadata,
						cid: cid,
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
		createPlayerError(
			'UnknownSource',
			`未知的 Track source: ${(track as Track).source}`,
		),
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
