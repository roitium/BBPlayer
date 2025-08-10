import type { Playlist } from '@/types/core/media'
import { err, ok } from 'neverthrow'
import {
	bilibiliApi,
	type bilibiliApi as BilibiliApiService,
} from '../api/bilibili/api'
import { av2bv } from '../api/bilibili/utils'
import { FacadeError } from '../errors/facade'

export class BilibiliFacade {
	constructor(private readonly bilibiliApi: typeof BilibiliApiService) {}

	public async fetchRemotePlaylistMetadata(
		remoteId: number,
		type: Playlist['type'],
	) {
		switch (type) {
			case 'collection': {
				const result = await this.bilibiliApi.getCollectionAllContents(remoteId)
				if (result.isErr()) {
					return err(
						new FacadeError('从 bilibili 获取播放列表元数据失败', result.error),
					)
				}
				const metadata = result.value.info
				return ok({
					title: metadata.title,
					description: metadata.intro,
					coverUrl: metadata.cover,
				})
			}
			case 'multi_page': {
				const result = await this.bilibiliApi.getVideoDetails(av2bv(remoteId))
				if (result.isErr()) {
					return err(
						new FacadeError('从 bilibili 获取视频元数据失败', result.error),
					)
				}
				const metadata = result.value
				return ok({
					title: metadata.title,
					description: metadata.desc,
					coverUrl: metadata.pic,
				})
			}
			case 'favorite': {
				const result = await this.bilibiliApi.getFavoriteListContents(
					remoteId,
					1,
				)
				if (result.isErr()) {
					return err(
						new FacadeError('从 bilibili 获取收藏夹元数据失败', result.error),
					)
				}
				const metadata = result.value.info
				return ok({
					title: metadata.title,
					description: metadata.intro,
					coverUrl: metadata.cover,
				})
			}
			default:
				return err(new FacadeError(`未知的播放列表类型：${type}`))
		}
	}
}

export const bilibiliFacade = new BilibiliFacade(bilibiliApi)
