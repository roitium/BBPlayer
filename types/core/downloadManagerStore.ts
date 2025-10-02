export interface DownloadTaskMeta {
	uniqueKey: string
	title: string
	coverUrl?: string
}

export interface DownloadTaskRuntime {
	progress: number // 0-100
	status: 'queued' | 'downloading' | 'completed' | 'failed'
	error?: string
}

export interface DownloadState {
	downloadsMeta: Record<string, DownloadTaskMeta>
	downloadsRuntime: Record<string, DownloadTaskRuntime>
	maxConcurrentDownloads: number
}

export interface DownloadActions {
	// external
	queueDownload: (track: {
		uniqueKey: string
		title: string
		coverUrl?: string
	}) => void
	cancelDownload: (uniqueKey: string) => void
	retryDownload: (uniqueKey: string) => void

	// internal
	_setDownloadStatus: (
		uniqueKey: string,
		status: DownloadTaskRuntime['status'],
		error?: string,
	) => void
	_setDownloadProgress: (uniqueKey: string, progress: number) => void

	_processQueue: () => void
}
