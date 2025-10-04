export interface DownloadTask {
	uniqueKey: string
	title: string
	coverUrl?: string
	status: 'queued' | 'downloading' | 'completed' | 'failed'
	error?: string
}

export interface DownloadState {
	downloads: Record<string, DownloadTask>
	maxConcurrentDownloads: number
}

export interface DownloadActions {
	// external
	queueDownloads: (
		tracks: {
			uniqueKey: string
			title: string
			coverUrl?: string
		}[],
	) => void
	cancelDownload: (uniqueKey: string) => void
	retryDownload: (uniqueKey: string) => void
	clearAll: () => void
	/**
	 * 手动触发队列下载，在应用启动时使用
	 */
	startDownload: () => void

	// internal
	_setDownloadStatus: (
		uniqueKey: string,
		status: DownloadTask['status'],
		error?: string,
	) => void
	_setDownloadProgress: (
		uniqueKey: string,
		current: number,
		total: number,
	) => void

	_processQueue: () => void
}
