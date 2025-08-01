import { TrackSourceData } from '@/types/services/track'
import { err, ok, Result } from 'neverthrow'
import { ValidationError } from '../core/errors/service'

export default function generateUniqueTrackKey(
	payload: TrackSourceData,
): Result<string, ValidationError> {
	switch (payload.source) {
		case 'bilibili': {
			const biliMeta = payload.bilibiliMetadata
			return biliMeta.isMultiPart
				? ok(`${payload.source}::${biliMeta.bvid}::${biliMeta.cid}`)
				: ok(`${payload.source}::${biliMeta.bvid}`)
		}
		case 'local': {
			const localMeta = payload.localMetadata
			return ok(`${payload.source}::${localMeta.localPath}`)
		}
		default:
			return err(new ValidationError(`未知的 Track source: ${payload}}`))
	}
}
