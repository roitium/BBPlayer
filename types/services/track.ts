export interface BilibiliMetadataPayload {
	bvid: string
	isMultiPart: boolean
	cid?: number
}

export interface LocalMetadataPayload {
	localPath: string
}

export interface CreateTrackPayloadBase {
	title: string
	artistId?: number
	coverUrl?: string
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
	title?: string
	coverUrl?: string
	duration?: number
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
