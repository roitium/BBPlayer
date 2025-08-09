import { playlistService } from '@/lib/services/playlistService'
import type { Playlist } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { useEffect, useState } from 'react'

const logger = log.extend('App/Playlist/Remote')

export default function useCheckLinkedToLocalPlaylist(
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
				toast.error(`查询 ${type}-${remoteId} 是否在本地存在失败`, {
					description: flatErrorMessage(playlist.error),
				})
				logger.error(
					'查询收藏夹是否在本地存在失败：',
					flatErrorMessage(playlist.error),
				)
				return
			}
			setLinkedPlaylistId(playlist.value ? playlist.value.id : undefined)
		}
		void check()
	}, [remoteId, type])

	return linkedPlaylistId
}
