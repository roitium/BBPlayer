import type { TrackSourceData } from '@/types/services/track'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import type { ServiceError } from '../errors'
import {
	createNotImplementedError,
	createValidationError,
} from '../errors/service'

export default function generateUniqueTrackKey(
	payload: TrackSourceData,
): Result<string, ServiceError> {
	switch (payload.source) {
		case 'bilibili': {
			const biliMeta = payload.bilibiliMetadata
			return biliMeta.isMultiPage
				? ok(`${payload.source}::${biliMeta.bvid}::${biliMeta.cid}`)
				: ok(`${payload.source}::${biliMeta.bvid}`)
		}
		case 'local': {
			// const localMeta = payload.localMetadata
			// return ok(`${payload.source}::${localMeta.localPath}`)
			// 基于 localPath 的业务主键太不可靠，考虑基于文件生成 hash
			return err(
				createNotImplementedError(`未实现 local source 的 uniqueKey 生成`),
			)
		}
		default:
			return err(
				createValidationError(
					`未知的 Track source: ${(payload as TrackSourceData).source}}`,
				),
			)
	}
}
