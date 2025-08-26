import { playlistService } from '@/lib/services/playlistService'
import type { Playlist } from '@/types/core/media'
import { toastAndLogError } from '@/utils/log'
import { useEffect, useState } from 'react'

/**
 * 检查某个 remoteId 是否已经被关联到本地播放列表
 * @param remoteId
 * @param type
 * @returns
 */
export default function useCheckLinkedToPlaylist(
	remoteId: number,
	type: Playlist['type'],
) {
	const [linkedPlaylistId, setLinkedPlaylistId] = useState<undefined | number>(
		undefined,
	)

	useEffect(() => {
		const check = async () => {
			const playlist = await playlistService.findPlaylistByTypeAndRemoteId(
				type,
				remoteId,
			)
			if (playlist.isErr()) {
				toastAndLogError(
					`查询 ${type}-${remoteId} 是否在本地存在失败`,
					playlist.error,
					'UI.Playlist.Remote',
				)
				return
			}
			setLinkedPlaylistId(playlist.value ? playlist.value.id : undefined)
		}
		void check()
	}, [remoteId, type])

	return linkedPlaylistId
}
