export interface BilibiliMetadataPayload {
	bvid: string
	isMultiPage: boolean
	cid?: number | null
	videoIsValid: boolean
	mainTrackTitle?: string | null // 如果是分 p 视频，保存该分 p 所在的主视频标题
}

export interface LocalMetadataPayload {
	localPath: string
}

export interface CreateTrackPayloadBase {
	title: string
	artistId?: number | null
	coverUrl?: string | null
	duration: number
}

export interface CreateBilibiliTrackPayload extends CreateTrackPayloadBase {
	source: 'bilibili'
	bilibiliMetadata: BilibiliMetadataPayload
}

interface CreateLocalTrackPayload extends CreateTrackPayloadBase {
	source: 'local'
	localMetadata: LocalMetadataPayload
}

export type CreateTrackPayload =
	| CreateBilibiliTrackPayload
	| CreateLocalTrackPayload

// export interface UpdateTrackPayload {
//   id: number
//   title?: string
//   source?: 'bilibili' | 'local'
//   artistId?: number
//   coverUrl?: string
//   duration?: number
//   bilibiliMetadata?: BilibiliMetadataPayload
//   localMetadata?: LocalMetadataPayload
// }

export interface UpdateTrackPayloadBase {
	id: number
	title?: string | null
	coverUrl?: string | null
	duration?: number | null
	artistId?: number | null
}

interface UpdateBilibiliTrackPayload extends UpdateTrackPayloadBase {
	source: 'bilibili'
	bilibiliMetadata?: Partial<BilibiliMetadataPayload>
}

interface UpdateLocalTrackPayload extends UpdateTrackPayloadBase {
	source: 'local'
	localMetadata?: Partial<LocalMetadataPayload>
}

export type UpdateTrackPayload =
	| UpdateBilibiliTrackPayload
	| UpdateLocalTrackPayload

export type TrackSourceData =
	| {
			source: 'bilibili'
			bilibiliMetadata: BilibiliMetadataPayload
	  }
	| {
			source: 'local'
			localMetadata: LocalMetadataPayload
	  }
