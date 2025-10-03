import type {
	DownloadActions,
	DownloadTask,
} from '@/types/core/downloadManagerStore'
import type { Track } from '@/types/core/media'
import log, { flatErrorMessage } from '@/utils/log'
import { Directory, File, Paths } from 'expo-file-system'
import { fetch } from 'expo/fetch'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'
import {
	bilibiliApi,
	type bilibiliApi as BilibiliApiService,
} from '../api/bilibili/api'
import type { CustomError } from '../errors'
import {
	createNotImplementedError,
	createServiceError,
} from '../errors/service'
import { trackService, type TrackService } from './trackService'

const logger = log.extend('Service.Download')
// 上报进度的间隔，单位毫秒
const PROGRESS_REPORT_THROTTLE_DELAY = 300

type ServiceCallbacks = Pick<
	DownloadActions,
	'_setDownloadProgress' | '_setDownloadStatus'
>

class DownloadService {
	private activeTasks = new Map<string, AbortController>()
	private callbacks: ServiceCallbacks | null = null

	constructor(
		private readonly bilibiliApi: typeof BilibiliApiService,
		private readonly trackService: TrackService,
	) {}

	public setCallbacks(callbacks: ServiceCallbacks) {
		if (this.callbacks) {
			logger.warning('已经设置了下载服务的回调函数')
			return
		}
		this.callbacks = callbacks
	}

	private getDownloadUrl(track: Track): ResultAsync<string, CustomError> {
		if (track.source !== 'bilibili') {
			return errAsync(
				createNotImplementedError('目前只支持下载 bilibili 来源的 track'),
			)
		}
		if (!track.bilibiliMetadata.cid) {
			return this.bilibiliApi
				.getPageList(track.bilibiliMetadata.bvid)
				.andThen((pages) => {
					if (pages.length === 0) {
						return errAsync(
							createServiceError(
								'FetchDownloadUrlFailed',
								'bvid 无法获取到页面列表',
							),
						)
					}
					return this.bilibiliApi.getAudioStream({
						bvid: track.bilibiliMetadata.bvid,
						cid: pages[0].cid,
						audioQuality: 30280,
						enableDolby: true,
						enableHiRes: true,
					})
				})
				.andThen((stream) => {
					return okAsync(stream.url)
				})
		} else {
			return this.bilibiliApi
				.getAudioStream({
					bvid: track.bilibiliMetadata.bvid,
					cid: track.bilibiliMetadata.cid,
					audioQuality: 30280,
					enableDolby: true,
					enableHiRes: true,
				})
				.andThen((stream) => {
					return okAsync(stream.url)
				})
		}
	}

	/**
	 * 开始一个下载任务。
	 * 这个方法是整个服务的核心。
	 * @param item - 从 Zustand store 获取的下载任务对象
	 */
	public async start(item: DownloadTask): Promise<void> {
		if (!this.callbacks) {
			throw new Error('DownloadService尚未初始化，请先调用 initialize()')
		}
		const { _setDownloadProgress, _setDownloadStatus } = this.callbacks
		const uniqueKey = item.uniqueKey

		if (this.activeTasks.has(uniqueKey)) {
			this.cancel(uniqueKey)
		}

		const controller = new AbortController()
		this.activeTasks.set(uniqueKey, controller)
		const directory = new Directory(Paths.document, 'downloads')
		const tempFile = new File(directory, `${uniqueKey}.m4s.tmp`)
		const finalFile = new File(directory, `${uniqueKey}.m4s`)
		let track: Track | null = null
		try {
			const trackResult = await this.trackService.getTrackByUniqueKey(uniqueKey)
			if (trackResult.isErr()) {
				throw new Error(
					`无法获取 track 信息 -- ${trackResult.error.type}: ` +
						flatErrorMessage(trackResult.error),
				)
			}
			track = trackResult.value
			const downloadUrl = await this.getDownloadUrl(track)
			if (downloadUrl.isErr()) {
				throw new Error(
					`无法获取下载链接 -- ${downloadUrl.error.type}: ` +
						flatErrorMessage(downloadUrl.error),
				)
			}
			const response = await fetch(downloadUrl.value, {
				signal: controller.signal,
				headers: {
					'User-Agent':
						'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
					Referer: 'https://www.bilibili.com',
				},
			})

			if (!response.ok) {
				throw new Error(`HTTP 状态码错误: ${response.status}`)
			}
			if (!response.body) {
				throw new Error('Response body 是 null')
			}

			const contentLength = response.headers.get('Content-Length')
			const totalBytes = contentLength ? parseInt(contentLength, 10) : 0
			let transferredBytes = 0
			let lastProgressUpdateTime = 0

			try {
				if (!directory.exists) {
					directory.create({ intermediates: true })
				}
				tempFile.create({ overwrite: true, intermediates: true })
			} catch (e) {
				throw new Error(
					`无法创建下载文件或目录: ${e instanceof Error ? e.message : String(e)}`,
				)
			}

			const progressTransform = new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					transferredBytes += chunk.byteLength

					const now = Date.now()
					if (
						totalBytes > 0 &&
						now - lastProgressUpdateTime > PROGRESS_REPORT_THROTTLE_DELAY
					) {
						_setDownloadProgress(uniqueKey, transferredBytes, totalBytes)
						lastProgressUpdateTime = now
					}

					controller.enqueue(chunk)
				},
			})

			const writable = tempFile.writableStream()

			await response.body.pipeThrough(progressTransform).pipeTo(writable)
			try {
				if (finalFile.exists) {
					finalFile.delete()
				}
				tempFile.move(finalFile)
			} catch (e) {
				throw new Error(
					`移动下载文件失败: ${e instanceof Error ? e.message : String(e)}`,
				)
			}
			await this.trackService.createOrUpdateTrackDownloadRecord({
				trackId: track.id,
				status: 'downloaded',
				fileSize: finalFile.size,
			})

			_setDownloadProgress(uniqueKey, totalBytes, totalBytes)
			logger.debug('call _setDownloadStatus', {
				uniqueKey,
				status: 'completed',
			})
			_setDownloadStatus(uniqueKey, 'completed')
			logger.debug('下载完成', { uniqueKey })
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					logger.info(`下载 ${uniqueKey} 已取消`)
				} else {
					logger.error(`下载 ${uniqueKey} 失败: ${error.message}`)
					if (track) {
						// 用户侧并不是很关心这个错误，所以就不再在 ui 展示，只是打印日志
						const result =
							await this.trackService.createOrUpdateTrackDownloadRecord({
								trackId: track.id,
								status: 'failed',
								fileSize: 0,
							})

						if (result.isErr()) {
							logger.error('更新 trackDownloads 失败: ', {
								error: flatErrorMessage(result.error),
							})
						}
					}
					_setDownloadStatus(uniqueKey, 'failed', error.message)
				}
			}
			try {
				if (tempFile.exists) {
					tempFile.delete()
				}
				if (finalFile.exists) {
					finalFile.delete()
				}
			} catch (e) {
				logger.warning(
					`删除下载文件失败: ${e instanceof Error ? e.message : String(e)}`,
				)
			}
			logger.debug('删除下载文件成功')
		} finally {
			this.activeTasks.delete(uniqueKey)
		}
	}

	/**
	 * 取消一个下载任务。
	 */
	public cancel(uniqueKey: string): void {
		const controller = this.activeTasks.get(uniqueKey)
		if (controller) {
			controller.abort()
			logger.info(`取消下载 ${uniqueKey}`)
		}
	}
}

export const downloadService = new DownloadService(bilibiliApi, trackService)
