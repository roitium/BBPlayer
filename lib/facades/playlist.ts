import log from '@/utils/log'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { ResultAsync } from 'neverthrow'
import {
	bilibiliApi,
	type bilibiliApi as BilibiliApiService,
} from '../api/bilibili/api'
import db from '../db/db'
import type * as schema from '../db/schema'
import { FacadeError } from '../errors/facade'
import { artistService, type ArtistService } from '../services/artistService'
import {
	playlistService,
	type PlaylistService,
} from '../services/playlistService'
import { trackService, type TrackService } from '../services/trackService'

const logger = log.extend('Facade')

export class PlaylistFacade {
	constructor(
		private readonly trackService: TrackService,
		private readonly bilibiliApi: typeof BilibiliApiService,
		private readonly playlistService: PlaylistService,
		private readonly artistService: ArtistService,
		private readonly db: ExpoSQLiteDatabase<typeof schema>,
	) {}

	/**
	 * 将 remote playlist 复制为 local playlist
	 * @param playlistId remote playlist 的 ID
	 * @returns 如果成功，则为 local playlist 的 ID
	 */
	public async copyRemotePlaylistToLocalPlaylist(playlistId: number) {
		return ResultAsync.fromPromise(
			this.db.transaction(async (tx) => {
				const playlistSvc = this.playlistService.withDB(tx)

				const playlist = await playlistSvc.getPlaylistById(playlistId)
				if (playlist.isErr()) {
					throw playlist.error
				}
				const playlistMetadata = playlist.value

				if (!playlistMetadata)
					throw new FacadeError(`未找到播放列表：${playlistId}`)
				if (playlistMetadata.type === 'local')
					throw new FacadeError(`播放列表：${playlistId} 不是 remote 类型`)

				logger.debug('step1: 获取并验证 remote 播放列表', playlistMetadata)

				const localPlaylistResult = await playlistSvc.createPlaylist({
					title: playlistMetadata.title + '(duplicate)',
					description: playlistMetadata.description ?? undefined,
					coverUrl: playlistMetadata.coverUrl ?? undefined,
					authorId: playlistMetadata.authorId ?? undefined,
					type: 'local',
					remoteSyncId: undefined,
				})
				if (localPlaylistResult.isErr()) {
					throw localPlaylistResult.error
				}
				const localPlaylist = localPlaylistResult.value
				logger.debug('step2: 创建本地播放列表', localPlaylist)

				const tracksMetadata = await playlistSvc.getPlaylistTracks(playlistId)
				if (tracksMetadata.isErr()) {
					throw tracksMetadata.error
				}
				const finalIds = tracksMetadata.value
					.filter((t) => {
						if (t.source === 'bilibili' && !t.bilibiliMetadata.videoIsValid)
							return false
						return true
					})
					.map((t) => t.id)
				logger.debug(
					'step3: 获取 remote 播放列表中的所有歌曲并清洗完成（对于 bilibili 音频，去除掉失效视频）',
				)

				const replaceResult = await playlistSvc.replacePlaylistAllTracks(
					localPlaylist.id,
					finalIds,
				)
				if (replaceResult.isErr()) {
					throw replaceResult.error
				}
				logger.debug('step4: 替换本地播放列表中的所有歌曲')

				logger.debug('将 remote 播放列表复制为 local 播放列表成功')

				return localPlaylist.id
			}),
			(e) => new FacadeError('将 remote 播放列表复制为 local 失败', e),
		)
	}
}

export const playlistFacade = new PlaylistFacade(
	trackService,
	bilibiliApi,
	playlistService,
	artistService,
	db,
)
