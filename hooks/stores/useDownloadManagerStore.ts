import { downloadService } from '@/lib/services/downloadService'
import type {
	DownloadActions,
	DownloadState,
} from '@/types/core/downloadManagerStore'
import log from '@/utils/log'
import { zustandStorage } from '@/utils/mmkv'
import createStickyEmitter from '@/utils/sticky-mitt'
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
					get()._processQueue()
				}
			},

			cancelDownload: (uniqueKey) => {
				set((state) => {
					delete state.downloads[uniqueKey]
				})
				downloadService.cancel(uniqueKey)
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
			},

			_setDownloadStatus: (uniqueKey, status, error) => {
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
		},
	),
)

downloadService.setCallbacks({
	_setDownloadProgress: useDownloadManagerStore.getState()._setDownloadProgress,
	_setDownloadStatus: useDownloadManagerStore.getState()._setDownloadStatus,
})

export { eventListner, ProgressEvent }
export default useDownloadManagerStore
