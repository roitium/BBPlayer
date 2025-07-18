import { Track } from '@/types/core/media'
import { ResultAsync } from 'neverthrow'
import { bilibiliApi as BilibiliApiService } from '../api/bilibili/api'
import { BilibiliApiError } from '../api/bilibili/errors'
import {
	DatabaseError,
	TrackNotFoundError,
	ValidationError,
} from '../services/errors'
import { TrackService } from '../services/trackService'

export class Facade {
	private readonly trackService: TrackService
	private readonly bilibiliApi: typeof BilibiliApiService
	constructor(
		trackService: TrackService,
		bilibiliApi: typeof BilibiliApiService,
	) {
		this.trackService = trackService
		this.bilibiliApi = bilibiliApi
	}

	/**
	 * 从 Bilibili API 获取视频信息，并创建一个新的音轨。
	 * @param bvid
	 * @param cid 基于 cid 是否存在判断 isMultiPart 的值
	 * @returns
	 */
	public addTrackFromBilibiliApi(
		bvid: string,
		cid?: number,
	): ResultAsync<
		Track,
		TrackNotFoundError | DatabaseError | BilibiliApiError | ValidationError
	> {
		const apiData = this.bilibiliApi.getVideoDetails(bvid)
		return apiData.andThen((data) => {
			const trackPayload = {
				title: data.title,
				source: 'bilibili' as const,
				bilibiliMetadata: {
					bvid,
					cid,
					isMultiPart: cid !== undefined,
				},
				coverUrl: data.pic,
				duration: data.duration,
				artist: {
					id: data.owner.mid,
					name: data.owner.name,
					source: 'bilibili' as const,
				},
			}
			return this.trackService.findOrCreateTrack(trackPayload)
		})
	}
}
