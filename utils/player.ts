import { err, ok, type Result } from 'neverthrow'
import type { Track as RNTPTrack } from 'react-native-track-player'
import { STREAM_EXPIRY_TIME } from '@/constants/player'
import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import type { Track } from '@/types/core/media'
import log from './log'

const playerLog = log.extend('PLAYER/UTILS')

/**
 * 将内部 Track 类型转换为 react-native-track-player 的 Track 类型。
 * @param track - 内部 Track 对象。
 * @returns 一个 Result 对象，成功时包含 RNTPTrack，失败时包含 Error。
 */
function convertToRNTPTrack(track: Track): Result<RNTPTrack, Error> {
	playerLog.debug('转换 Track 为 RNTPTrack', {
		trackId: track.id,
		title: track.title,
		artist: track.artist,
	})

	let url = ''
	if (track.source === 'bilibili' && track.biliStreamUrl) {
		url = track.biliStreamUrl.url
		playerLog.debug('使用 B 站音频流 URL', {
			quality: track.biliStreamUrl.quality,
		})
	} else if (track.source === 'local' && track.localStreamUrl) {
		url = track.localStreamUrl
		playerLog.debug('使用本地音频流 URL', { url })
	}

	// 如果没有有效的 URL，返回错误
	if (!url) {
		const errorMsg = '没有找到有效的音频流 URL'
		playerLog.debug(`警告：${errorMsg}`, { source: track.source })
		return err(new Error(errorMsg)) // 使用 err 包装错误
	}

	const rnTrack: RNTPTrack = {
		id: track.id,
		url,
		title: track.title,
		artist: track.artist,
		artwork: track.cover,
		duration: track.duration,
		userAgent:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
		headers: {
			referer: 'https://www.bilibili.com',
		},
	}

	playerLog.debug('RNTPTrack 转换完成', {
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
function checkBilibiliAudioExpiry(track: Track): boolean {
	const now = Date.now()
	const isExpired =
		!track.biliStreamUrl ||
		now - track.biliStreamUrl.getTime > STREAM_EXPIRY_TIME
	playerLog.debug('检查 B 站音频流过期状态', {
		trackId: track.id,
		hasStream: !!track.biliStreamUrl,
		streamAge: track.biliStreamUrl ? now - track.biliStreamUrl.getTime : 'N/A',
		isExpired,
		expiryTime: STREAM_EXPIRY_TIME,
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
): Promise<Result<{ track: Track; needsUpdate: boolean }, Error>> {
	playerLog.debug('开始检查并更新音频流', {
		trackId: track.id,
		title: track.title,
	})

	// 1. 处理本地音频
	if (track.source === 'local') {
		playerLog.debug('本地音频，无需更新流', { trackId: track.id })
		return ok({ track, needsUpdate: false }) // 本地音频总是 ok
	}

	// 2. 处理 Bilibili 音频
	if (track.source === 'bilibili') {
		const needsUpdate = checkBilibiliAudioExpiry(track)

		if (!needsUpdate) {
			playerLog.debug('B 站音频流仍然有效，无需更新', {
				trackId: track.id,
				getTime: track.biliStreamUrl
					? new Date(track.biliStreamUrl.getTime).toISOString()
					: 'N/A',
			})
			return ok({ track, needsUpdate: false }) // 流有效，返回 ok
		}

		// 3. 需要更新 Bilibili 音频流
		playerLog.debug('需要更新 B 站音频流', { trackId: track.id })
		try {
			const bvid = track.id
			let cid = track.cid

			// 3.1 获取 CID (如果需要)
			if (!cid) {
				playerLog.debug('尝试获取视频分 P 列表以确定 CID', { bvid })
				const pageListResult = await bilibiliApi.getPageList(bvid)

				// 使用 match 处理 Result
				const cidResult = pageListResult.match<Result<number, Error>>(
					(pages) => {
						if (pages.length > 0) {
							const firstPageCid = pages[0].cid
							playerLog.debug('使用第一个分 P 的 CID', {
								bvid,
								cid: firstPageCid,
							})
							return ok(firstPageCid)
						}
						playerLog.debug('警告：视频没有分 P 信息，无法获取 CID', {
							bvid,
						})
						return err(new Error(`视频 ${bvid} 没有分 P 信息`))
					},
					(error) => {
						// playerLog.sentry('获取视频分 P 列表失败', error)
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
				playerLog.debug('使用已有的 CID', { bvid, cid })
			}

			// 3.2 获取新的音频流
			playerLog.debug('开始获取新的音频流', { bvid, cid })
			const streamUrlResult = await bilibiliApi.getAudioStream({
				bvid,
				cid: cid as number, // cid 此时一定有值
				audioQuality: 30280,
				enableDolby: false,
				enableHiRes: false,
			})

			// 使用 match 处理获取音频流的 Result
			return streamUrlResult.match<
				Result<{ track: Track; needsUpdate: boolean }, Error>
			>(
				(streamInfo) => {
					if (!streamInfo || !streamInfo.url) {
						const errorMsg = '获取音频流成功但没有有效的 URL'
						// playerLog.sentry(errorMsg, { streamInfo, bvid, cid })
						return err(new Error(errorMsg)) // 返回错误
					}

					playerLog.debug('音频流获取成功', {
						bvid,
						cid,
						url: streamInfo.url,
						quality: streamInfo.quality,
						type: streamInfo.type,
					})

					// 更新 track 对象
					const updatedTrack = {
						...track,
						cid: cid, // 确保 cid 更新
						biliStreamUrl: {
							url: streamInfo.url,
							quality: streamInfo.quality || 0,
							getTime: Date.now(),
							type: streamInfo.type || 'dash',
						},
					}

					playerLog.debug('Track 对象已更新音频流信息', {
						trackId: updatedTrack.id,
						title: updatedTrack.title,
						streamUrl: updatedTrack.biliStreamUrl.url,
						getTime: new Date(updatedTrack.biliStreamUrl.getTime).toISOString(),
					})

					return ok({ track: updatedTrack, needsUpdate: true })
				},
				(error) => {
					// playerLog.sentry('获取音频流失败', error)
					error.message = `获取音频流失败: ${error.message}`
					return err(error)
				},
			)
		} catch (error: unknown) {
			playerLog.sentry('更新音频流过程中发生意外错误', error)
			const wrappedError =
				error instanceof Error ? error : new Error(String(error))
			return err(wrappedError)
		}
	}

	const unknownSourceError = new Error(`未知的 Track source: ${track.source}`)
	// playerLog.sentry(unknownSourceError.message, {
	//   trackId: track.id,
	//   source: track.source,
	// })
	return err(unknownSourceError)
}

function isTargetTrack(
	track: Track,
	targetId: string | undefined,
	targetCid: number | undefined,
) {
	if (track.isMultiPage) {
		return track.cid === targetCid
	}
	return track.id === targetId
}

/**
 * 上报播放记录
 * 由于这只是一个非常边缘的功能，所以发生报错时只写个 log，返回 void
 */
async function reportPlaybackHistory(track: Track): Promise<void> {
	if (!useAppStore.getState().settings.sendPlayHistory) return
	if (!track.cid || !track.id || !(track.source === 'bilibili')) {
		return
	}
	playerLog.debug('上报播放记录', {
		bvid: track.id,
		cid: track.cid,
	})
	const result = await bilibiliApi.reportPlaybackHistory(track.id, track.cid)
	if (result.isErr()) {
		playerLog.warn('上报播放记录到 bilibili 失败', {
			params: {
				bvid: track.id,
				cid: track.cid,
			},
			error: result.error,
		})
	}
	return
}

export {
	convertToRNTPTrack,
	checkAndUpdateAudioStream,
	checkBilibiliAudioExpiry,
	isTargetTrack,
	reportPlaybackHistory,
}
