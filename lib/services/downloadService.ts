import useAppStore, { serializeCookieObject } from '@/hooks/stores/useAppStore'
import type {
	DownloadActions,
	DownloadTask,
} from '@/types/core/downloadManagerStore'
import type { Track } from '@/types/core/media'
import log, { flatErrorMessage } from '@/utils/log'
import { Directory, File, Paths } from 'expo-file-system'
import { fetch } from 'expo/fetch'
import type { ResultAsync } from 'neverthrow'
import { errAsync, okAsync } from 'neverthrow'
import {
	bilibiliApi,
	type bilibiliApi as BilibiliApiService,
} from '../api/bilibili/api'
import type { CustomError, DatabaseError, ServiceError } from '../errors'
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
		const cookieList = useAppStore.getState().bilibiliCookie
		const cookie = cookieList ? serializeCookieObject(cookieList) : ''
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
			const headers = {
				'User-Agent':
					'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BiliApp/6.66.0',
				Referer: 'https://www.bilibili.com',
				Cookie: cookie,
			}
			const response = await fetch(downloadUrl.value, {
				signal: controller.signal,
				headers,
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
			const validateStream = this.createMagicNumberValidator('ftyp')

			const writable = tempFile.writableStream()

			await response.body
				.pipeThrough(validateStream)
				.pipeThrough(progressTransform)
				.pipeTo(writable)
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
			const recordResult =
				await this.trackService.createOrUpdateTrackDownloadRecord({
					trackId: track.id,
					status: 'downloaded',
					fileSize: finalFile.size,
				})
			if (recordResult.isErr()) {
				throw recordResult.error
			}
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

	/**
	 * 创建一个用于校验文件头部 Magic Number 的 TransformStream。
	 * @param magic - 期望在文件头部找到的 ASCII 字符串，例如 'ftyp'。
	 * @param checkUntilByte - 检查到文件的第几个字节为止。通常文件头信息不会很长。
	 */
	private createMagicNumberValidator(
		magic: string,
		checkUntilByte = 64,
	): TransformStream<Uint8Array, Uint8Array> {
		let checked = false
		let buffer = new Uint8Array(0)

		return new TransformStream({
			transform(chunk, controller) {
				if (checked) {
					controller.enqueue(chunk)
					return
				}

				const newBuffer = new Uint8Array(buffer.length + chunk.length)
				newBuffer.set(buffer)
				newBuffer.set(chunk, buffer.length)
				buffer = newBuffer

				const bufferString = new TextDecoder().decode(
					buffer.slice(0, checkUntilByte),
				)

				if (bufferString.includes(magic)) {
					logger.debug('找到了 magic number，校验通过')
					checked = true
					controller.enqueue(buffer)
					buffer = new Uint8Array(0)
				} else if (buffer.length >= checkUntilByte) {
					controller.error(
						new Error(`文件头校验不通过(有时 b 站抽风，可多尝试几次)`),
					)
				}
			},
			flush(controller) {
				if (!checked) {
					controller.error(new Error('文件长度过短，无法识别文件规格'))
				} else if (buffer.length > 0) {
					controller.enqueue(buffer)
				}
			},
		})
	}

	public clearAll(): void {
		for (const key of this.activeTasks.keys()) {
			this.cancel(key)
		}
	}

	/**
	 * 删除一个 track 的数据库中下载记录及其实际文件
	 * @param uniqueKey
	 * @returns
	 */
	public delete(
		uniqueKey: string,
	): ResultAsync<true, ServiceError | DatabaseError> {
		return this.trackService
			.getTrackByUniqueKey(uniqueKey)
			.andThen((track) => {
				return this.trackService
					.deleteTrackDownloadRecord(track.id)
					.andTee(() => {
						logger.info(`删除了 track ${uniqueKey} 的下载记录`)
					})
			})
			.andThen(() => {
				const file = new File(Paths.document, 'downloads', `${uniqueKey}.m4s`)
				try {
					file.delete()
				} catch (e) {
					return errAsync(
						createServiceError('DeleteDownloadRecordFailed', '无法删除文件', {
							cause: e,
						}),
					)
				}
				return okAsync(true as const)
			})
	}

	/**
	 * 删除所有下载记录及其实际文件
	 */
	public deleteAll() {
		return this.trackService.deleteAllTrackDownloadRecords().andThen(() => {
			const directory = new Directory(Paths.document, 'downloads')
			try {
				directory.delete()
			} catch (e) {
				return errAsync(
					createServiceError('DeleteDownloadRecordFailed', '无法删除文件夹', {
						cause: e,
					}),
				)
			}
			return okAsync(true as const)
		})
	}
}

export const downloadService = new DownloadService(bilibiliApi, trackService)
