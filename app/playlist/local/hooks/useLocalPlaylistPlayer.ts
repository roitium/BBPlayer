import { alert } from '@/components/modals/AlertModal'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import type { Track } from '@/types/core/media'
import { toastAndLogError } from '@/utils/log'
import { storage } from '@/utils/mmkv'
import { useCallback } from 'react'
import type { MMKV } from 'react-native-mmkv'
import { useMMKVBoolean } from 'react-native-mmkv'

const SCOPE = 'UI.Playlist.Local.Player'

export function useLocalPlaylistPlayer(tracks: Track[]) {
	const addToQueue = usePlayerStore((state) => state.addToQueue)
	const [ignoreAlertReplacePlaylist, setIgnoreAlertReplacePlaylist] =
		useMMKVBoolean('ignore_alert_replace_playlist', storage as MMKV)

	const playAll = useCallback(
		async (startFromId?: string) => {
			if (!tracks || tracks.length === 0) {
				return
			}

			try {
				await addToQueue({
					tracks: tracks,
					playNow: true,
					clearQueue: true,
					startFromKey: startFromId,
					playNext: false,
				})
			} catch (error) {
				toastAndLogError('播放全部失败', error, SCOPE)
			}
		},
		[addToQueue, tracks],
	)

	const handleTrackPress = useCallback(
		(track: Track) => {
			if (!ignoreAlertReplacePlaylist) {
				alert(
					'替换播放列表',
					'点击列表中的单曲会直接替换当前播放列表，是否继续？（下次不再提醒）',
					[
						{ text: '取消' },
						{
							text: '确定',
							onPress: () => {
								setIgnoreAlertReplacePlaylist(true)
								void playAll(track.uniqueKey)
							},
						},
					],
					{ cancelable: true },
				)
				return
			}
			void playAll(track.uniqueKey)
		},
		[ignoreAlertReplacePlaylist, playAll, setIgnoreAlertReplacePlaylist],
	)

	return { playAll, handleTrackPress }
}
