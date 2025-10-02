import { downloadService } from '@/lib/services/downloadService'
import type {
	DownloadActions,
	DownloadState,
	DownloadTaskRuntime,
} from '@/types/core/downloadManagerStore'
import log from '@/utils/log'
import { zustandStorage } from '@/utils/mmkv'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const logger = log.extend('Store.DownloadManager')

const useDownloadManagerStore = create<DownloadState & DownloadActions>()(
	persist(
		immer((set, get) => ({
			downloadsMeta: {},
			downloadsRuntime: {},
			maxConcurrentDownloads: 3,

			queueDownload: (track) => {
				const key = track.uniqueKey
				const existing = get().downloadsRuntime[key]
				if (existing && existing.status !== 'completed') {
					logger.warning('该下载任务已在队列或正在下载中，跳过添加')
					return
				}
				set((state) => {
					state.downloadsMeta[key] = {
						uniqueKey: key,
						title: track.title,
						coverUrl: track.coverUrl,
					}
					state.downloadsRuntime[key] = {
						progress: 0,
						error: undefined,
						status: 'queued',
					}
				})
				get()._processQueue()
			},

			cancelDownload: (uniqueKey) => {
				set((state) => {
					delete state.downloadsRuntime[uniqueKey]
					delete state.downloadsMeta[uniqueKey]
				})
				get()._processQueue()
			},

			retryDownload: (uniqueKey) => {
				set((state) => {
					const task = state.downloadsRuntime[uniqueKey]
					if (!task || task.status !== 'failed') return
					state.downloadsRuntime[uniqueKey] = {
						status: 'queued',
						progress: 0,
						error: undefined,
					}
				})
				get()._processQueue()
			},

			_setDownloadStatus: (uniqueKey, status, error) => {
				set((state) => {
					const download = state.downloadsRuntime[uniqueKey]
					if (!download) return
					download.status = status
					download.error = error ?? undefined
				})

				if (status === 'completed' || status === 'failed') {
					get()._processQueue()
				}
			},

			_setDownloadProgress: (uniqueKey, progress) => {
				set((state) => {
					const runtime = state.downloadsRuntime[uniqueKey]
					if (!runtime) return
					runtime.progress = progress
				})
			},

			_processQueue: () => {
				const { maxConcurrentDownloads, _setDownloadStatus } = get()
				const allRuntime = Object.values(get().downloadsRuntime)
				const active = allRuntime.filter(
					(d) => d.status === 'downloading',
				).length
				if (active >= maxConcurrentDownloads) return

				let pickedKey: string | null = null
				set((state) => {
					const keys = Object.keys(state.downloadsRuntime)
					for (const k of keys) {
						if (state.downloadsRuntime[k].status === 'queued') {
							state.downloadsRuntime[k].status = 'downloading'
							pickedKey = k
							break
						}
					}
					return state
				})

				if (!pickedKey) return

				const entry = get().downloadsMeta[pickedKey]

				downloadService.start(entry).catch((e) => {
					logger.error(
						`下载失败，未捕获的错误：${e instanceof Error ? e.message : String(e)}`,
					)
					set((state) => {
						_setDownloadStatus(
							entry.uniqueKey,
							'failed',
							e instanceof Error ? e.message : String(e),
						)
						return state
					})
				})
				logger.info(`开始下载 ${entry.title}: ${entry.uniqueKey}`)
			},
		})),
		{
			name: 'download-manager-storage',
			storage: createJSONStorage(() => zustandStorage),
			partialize: (state) => ({
				downloadsMeta: state.downloadsMeta,
				maxConcurrentDownloads: state.maxConcurrentDownloads,
			}),
			merge: (persistedState, currentState) => {
				if (!persistedState) return currentState

				const persistedMeta =
					(persistedState as DownloadState).downloadsMeta ?? {}
				const maxConcurrent =
					(persistedState as DownloadState).maxConcurrentDownloads ??
					currentState.maxConcurrentDownloads

				const runtime = Object.fromEntries(
					Object.keys(persistedMeta).map((k) => [
						k,
						{
							status: 'queued',
							progress: 0,
							error: undefined,
						} as DownloadTaskRuntime,
					]),
				)

				return {
					...currentState,
					downloadsMeta: persistedMeta,
					downloadsRuntime: runtime,
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

export default useDownloadManagerStore
