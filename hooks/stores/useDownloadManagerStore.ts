import { downloadService } from '@/lib/services/downloadService'
import type {
	DownloadActions,
	DownloadState,
} from '@/types/core/downloadManagerStore'
import log from '@/utils/log'
import { zustandStorage } from '@/utils/mmkv'
import createStickyEmitter from '@/utils/sticky-mitt'
import notifee, {
	AndroidImportance,
	AuthorizationStatus,
} from '@notifee/react-native'
import { AppState } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type ProgressEvent = Record<
	`progress:${string}`,
	{
		current: number
		total: number
	}
>

const logger = log.extend('Store.DownloadManager')
const eventListner = createStickyEmitter<ProgressEvent>()

const NOTIFICATION_ID = 'download-manager-summary'
let disableNotification = false
let _channelId: string | null = null

AppState.addEventListener('change', async (state) => {
	if (state === 'active') {
		const settings = await notifee.getNotificationSettings()
		disableNotification =
			settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED
	}
})

async function ensureChannel() {
	if (_channelId) return _channelId
	_channelId = await notifee.createChannel({
		id: 'download-manager',
		name: '下载管理器',
		description: '下载管理器正在下载新的音频流',
		importance: AndroidImportance.LOW,
	})
	return _channelId
}

/**
 * 更新或显示汇总通知：
 * - 显示正在进行中的 activeCount，queuedCount
 * - 计算 aggregate progress（如果有可计算的 total），否则显示 indeterminate
 */
async function updateSummaryNotification(
	getState: () => DownloadState & DownloadActions,
) {
	if (disableNotification) return
	try {
		const channelId = await ensureChannel()
		const { downloads } = getState()
		const all = Object.values(downloads)

		const active = all.filter((d) => d.status === 'downloading')
		const queued = all.filter((d) => d.status === 'queued')
		const failed = all.filter((d) => d.status === 'failed')

		const title =
			all.length === 0 ? '下载已完成' : `${all.length} 个任务正在处理`
		let body = ''
		if (all.length === 0) {
			body = '所有下载已完成或已取消。'
		} else {
			body = `${active.length} 个下载中 · ${queued.length} 个排队 · ${failed.length} 个失败`
		}

		if (all.length === 0) {
			await notifee.cancelNotification(NOTIFICATION_ID)
			return
		}

		await notifee.displayNotification({
			id: NOTIFICATION_ID,
			title,
			body,
			android: {
				channelId,
				ongoing: true,
				autoCancel: false,
				onlyAlertOnce: true,
			},
		})
	} catch (e) {
		logger.error('更新通知失败：', e)
	}
}

const useDownloadManagerStore = create<DownloadState & DownloadActions>()(
	persist(
		immer((set, get) => ({
			downloads: {},
			maxConcurrentDownloads: 3,

			queueDownloads: (tracks) => {
				const existingDownloads = get().downloads
				let itemsAdded = 0

				set((state) => {
					for (const track of tracks) {
						const key = track.uniqueKey
						if (
							existingDownloads[key] &&
							existingDownloads[key].status !== 'completed'
						) {
							logger.warning(`批量添加：任务 ${track.title} 已在队列中，跳过`)
							continue
						}
						state.downloads[key] = {
							uniqueKey: key,
							title: track.title,
							coverUrl: track.coverUrl,
							status: 'queued',
							error: undefined,
						}
						itemsAdded++
					}
				})

				if (itemsAdded > 0) {
					logger.info(`批量添加了 ${itemsAdded} 个新任务到队列。`)
					void updateSummaryNotification(get)
					get()._processQueue()
				}
			},

			cancelDownload: (uniqueKey) => {
				set((state) => {
					delete state.downloads[uniqueKey]
				})
				downloadService.cancel(uniqueKey)
				void updateSummaryNotification(get)
				get()._processQueue()
			},

			retryDownload: (uniqueKey) => {
				set((state) => {
					const task = state.downloads[uniqueKey]
					if (!task || task.status !== 'failed') return
					state.downloads[uniqueKey] = {
						...task,
						status: 'queued',
						error: undefined,
					}
				})
				void updateSummaryNotification(get)
				get()._processQueue()
			},

			startDownload: () => {
				get()._processQueue()
			},

			clearAll: () => {
				downloadService.clearAll()
				set((state) => {
					state.downloads = {}
				})
				void updateSummaryNotification(get)
			},

			_setDownloadStatus: (uniqueKey, status, error) => {
				console.log('setDownloadStatus', uniqueKey, status, error)
				set((state) => {
					const download = state.downloads[uniqueKey]
					if (!download) {
						return
					}
					if (status === 'completed') {
						delete state.downloads[uniqueKey]
						return
					}
					download.status = status
					download.error = error ?? undefined
				})

				void updateSummaryNotification(get)
				if (status === 'completed' || status === 'failed') {
					get()._processQueue()
				}
			},

			_setDownloadProgress: (uniqueKey, current, total) => {
				eventListner.emitSticky(`progress:${uniqueKey}`, {
					current,
					total,
				})
			},

			_processQueue: () => {
				const { downloads, maxConcurrentDownloads, _setDownloadStatus } = get()
				const allTasks = Object.values(downloads)

				let activeCount = allTasks.filter(
					(d) => d.status === 'downloading',
				).length

				const queuedTasks = allTasks.filter((d) => d.status === 'queued')

				if (queuedTasks.length === 0) {
					void updateSummaryNotification(get)
					return
				}

				while (activeCount < maxConcurrentDownloads && queuedTasks.length > 0) {
					const taskToStart = queuedTasks.shift()
					if (!taskToStart) break

					const key = taskToStart.uniqueKey

					activeCount++
					set((state) => {
						if (state.downloads[key]) {
							state.downloads[key].status = 'downloading'
						}
					})

					const entry = get().downloads[key]
					if (entry) {
						logger.info(`开始下载 ${entry.title}: ${entry.uniqueKey}`)
						downloadService.start(entry).catch((e) => {
							const errorMessage = e instanceof Error ? e.message : String(e)
							logger.error(`下载失败，未捕获的错误：${errorMessage}`)
							_setDownloadStatus(entry.uniqueKey, 'failed', errorMessage)
						})
					}
				}

				void updateSummaryNotification(get)
			},
		})),
		{
			name: 'download-manager-storage-v2',
			storage: createJSONStorage(() => zustandStorage),
			partialize: (state) => ({
				downloads: state.downloads,
				maxConcurrentDownloads: state.maxConcurrentDownloads,
			}),
			merge: (persistedState, currentState) => {
				if (!persistedState) return currentState

				const persistedTasks = (persistedState as DownloadState).downloads ?? {}
				const maxConcurrent =
					(persistedState as DownloadState).maxConcurrentDownloads ??
					currentState.maxConcurrentDownloads

				const tasks = Object.fromEntries(
					Object.entries(persistedTasks).map(([k, v]) => [
						k,
						{ ...v, status: v.status === 'downloading' ? 'queued' : v.status },
					]),
				)

				return {
					...currentState,
					downloads: tasks,
					maxConcurrentDownloads: maxConcurrent,
				}
			},
			onRehydrateStorage: (_state) => {
				return (_state, error) => {
					if (error) {
						logger.error('download manager store rehydration 失败：', error)
					} else if (_state) {
						void updateSummaryNotification(() => _state)
					}
				}
			},
		},
	),
)

downloadService.setCallbacks({
	_setDownloadProgress: useDownloadManagerStore.getState()._setDownloadProgress,
	_setDownloadStatus: useDownloadManagerStore.getState()._setDownloadStatus,
})

export { eventListner, ProgressEvent }
export default useDownloadManagerStore
