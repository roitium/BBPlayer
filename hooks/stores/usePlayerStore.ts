import { produce } from 'immer'
import { err, ok, type Result } from 'neverthrow'
import TrackPlayer, {
	RepeatMode,
	usePlaybackState,
	useProgress,
} from 'react-native-track-player'
import { create } from 'zustand'
import { PRELOAD_TRACKS } from '@/constants/player'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import type { Track } from '@/types/core/media'
import type {
	addToQueueParams,
	PlayerState,
	PlayerStore,
} from '@/types/core/playerStore'
import type { BilibiliApiError } from '@/utils/errors'
import log from '@/utils/log'
import {
	checkAndUpdateAudioStream,
	checkBilibiliAudioExpiry,
	convertToRNTPTrack,
	getTrackKey,
	isTargetTrack,
	reportPlaybackHistory,
} from '@/utils/player'
import Toast from '@/utils/toast'

const playerLog = log.extend('PLAYER/STORE')

const checkPlayerReady = () => {
	if (!global.playerIsReady) {
		Toast.error('播放器未初始化', { description: '请稍后再试' })
		return false
	}
	return true
}

/**
 * 播放器状态存储
 * 采用 zustand 自己维护一个 queue，rntp 仅用于播放当前的 track，通过 TrackPlayer.load 来替换当前播放的内容，所有队列操作都通过该 store 进行
 */
export const usePlayerStore = create<PlayerStore>()((set, get) => {
	const initialState: PlayerState = {
		tracks: {},
		orderedList: [],
		shuffledList: [],
		currentTrackKey: null,
		isPlaying: false,
		isBuffering: false,
		repeatMode: RepeatMode.Off,
		shuffleMode: false,
	}

	const store = {
		...initialState,

		_getActiveList: () => {
			const { shuffleMode, orderedList, shuffledList } = get()
			return shuffleMode ? shuffledList : orderedList
		},

		_getCurrentTrack: (): Track | null => {
			const { tracks, currentTrackKey } = get()
			return currentTrackKey ? (tracks[currentTrackKey] ?? null) : null
		},

		_getCurrentIndex: (): number => {
			const { currentTrackKey } = get()
			if (!currentTrackKey) return -1
			return get()._getActiveList().indexOf(currentTrackKey)
		},

		resetPlayer: async () => {
			if (!global.playerIsReady) return

			try {
				await TrackPlayer.reset()
				set(initialState)
			} catch (error) {
				playerLog.sentry('重置播放器失败:', error)
			}
		},

		rntpQueue: async () => {
			const currentTrack = await TrackPlayer.getActiveTrack()
			return currentTrack ? [currentTrack] : []
		},

		removeTrack: async (id: string, cid: number | undefined) => {
			playerLog.debug('removeTrack()', { id, cid })
			const { tracks, currentTrackKey } = get()

			// 通过 id 和 cid 反向查找 key
			const keyToRemove = Object.keys(tracks).find((key) =>
				isTargetTrack(tracks[key], id, cid),
			)

			if (!keyToRemove) {
				Toast.error('播放器异常', {
					description: '在播放列表中找不到该曲目，已重置播放器',
				})
				await get().resetStore()
				return
			}

			// 如果删除的是当前歌曲，先处理播放状态
			if (currentTrackKey === keyToRemove) {
				if (get()._getActiveList().length === 1) {
					await get().resetStore()
					return
				}
				// 这里我们假设 skipToNext/Previous 会处理好跳转
				// 为了避免竞态条件，先跳转再删除
				const currentTrack = get()._getCurrentTrack()
				const lastTrackKey = get()._getActiveList().at(-1)

				if (currentTrack && getTrackKey(currentTrack) === lastTrackKey) {
					await get().skipToPrevious()
				} else {
					await get().skipToNext()
				}
			}

			set(
				produce((state: PlayerState) => {
					delete state.tracks[keyToRemove]
					const orderedIndex = state.orderedList.indexOf(keyToRemove)
					if (orderedIndex > -1) state.orderedList.splice(orderedIndex, 1)
					const shuffledIndex = state.shuffledList.indexOf(keyToRemove)
					if (shuffledIndex > -1) state.shuffledList.splice(shuffledIndex, 1)
				}),
			)
		},

		/**
		 * 添加多条曲目到队列
		 * 当 playNow 为 false 时，startFromId 不生效
		 * 提供
		 * @param tracks
		 * @param playNow 是否立即播放（在 startFromId 为空时是播放新增队列的第一首歌曲）
		 * @param clearQueue
		 * @param startFromId 从指定 id 开始播放
		 * @param startFromCid 从指定 cid 开始播放
		 * @param playNext （仅在 playNow 为 false 时）是否把新曲目插入到当前播放曲目的后面
		 * @returns
		 */
		// ✨ FIX: 修正后的 addToQueue 函数
		addToQueue: async ({
			tracks,
			playNow,
			clearQueue,
			startFromId,
			startFromCid,
			playNext,
		}: addToQueueParams) => {
			if (!checkPlayerReady() || tracks.length === 0) return
			if (clearQueue) await get().resetStore()

			const existingTracks = get().tracks
			const newTracks = tracks.filter(
				(track) =>
					!Object.values(existingTracks).some((t) =>
						isTargetTrack(t, track.id, track.cid),
					),
			)

			// 没有新歌，需要跳转播放
			if (newTracks.length === 0) {
				if (playNow) {
					let targetKey: string | null = null
					// 遍历现有的 tracks 字典来找到匹配的 key
					for (const key in existingTracks) {
						if (isTargetTrack(existingTracks[key], startFromId, startFromCid)) {
							targetKey = key
							break
						}
					}

					if (targetKey) {
						const targetIndex = get()._getActiveList().indexOf(targetKey)
						if (targetIndex !== -1) {
							await get().skipToTrack(targetIndex)
						}
					}
				}
				return
			}

			// 有新歌加入
			set(
				produce((state: PlayerState) => {
					// 1. 先把新歌数据加进去
					const newKeys = newTracks.map(getTrackKey)
					newTracks.forEach((track, i) => {
						state.tracks[newKeys[i]] = track
					})

					// 2. 计算插入位置
					const currentKey = state.currentTrackKey
					let orderedInsertIdx = state.orderedList.length
					let shuffledInsertIdx = state.shuffledList.length
					if (playNext && currentKey) {
						orderedInsertIdx = state.orderedList.indexOf(currentKey) + 1
						shuffledInsertIdx = state.shuffledList.indexOf(currentKey) + 1
					}

					// 3. 插入 key 列表
					state.orderedList.splice(orderedInsertIdx, 0, ...newKeys)
					state.shuffledList.splice(shuffledInsertIdx, 0, ...newKeys)

					// 4. 决定当前播放的 key
					if (playNow) {
						let keyToPlay = newKeys[0] // 默认播放新歌的第一首

						// 如果指定了开始播放的歌曲，就从 newTracks 数组里找到它
						if (startFromId) {
							// 使用 isTargetTrack 找到那个完整的 track 对象
							const targetTrackInNewList = newTracks.find((t) =>
								isTargetTrack(t, startFromId, startFromCid),
							)

							// 如果找到了，就用这个完整的对象去生成可靠的 key
							if (targetTrackInNewList) {
								keyToPlay = getTrackKey(targetTrackInNewList)
							}
						}
						state.currentTrackKey = keyToPlay
					} else if (!state.currentTrackKey && state.orderedList.length > 0) {
						// 如果当前无播放，则默认指向列表第一首
						state.currentTrackKey = state.orderedList[0]
					}
				}),
			)

			if (playNow) {
				const keyToPlay = get().currentTrackKey
				if (!keyToPlay) {
					playerLog.error('播放器异常，无法找到当前播放的 key', {
						list: get()._getActiveList(),
					})
					return
				}
				const indexToPlay = get()._getActiveList().indexOf(keyToPlay)
				if (indexToPlay !== -1) {
					await get().skipToTrack(indexToPlay)
				}
			}
		},

		preloadTracks: async (index: number) => {
			const activeList = get()._getActiveList()
			const { tracks } = get()
			const preloadStartIndex = index + 1
			const preloadEndIndex = Math.min(
				preloadStartIndex + PRELOAD_TRACKS,
				activeList.length,
			)
			const keysToPreload = activeList.slice(preloadStartIndex, preloadEndIndex)
			const tracksToPreload = keysToPreload.map((key) => tracks[key])
			playerLog.debug(`开始预加载 ${tracksToPreload.length} 首曲目`)

			if (tracksToPreload.length > 0) {
				await Promise.all(
					tracksToPreload.map((track) => get().patchMetadataAndAudio(track)),
				)
			}
		},

		// 切换播放/暂停
		togglePlay: async () => {
			try {
				const { isPlaying } = get()
				const currentTrack = get()._getCurrentTrack()
				if (!checkPlayerReady() || !currentTrack) return

				if (!(await get().rntpQueue()).length) {
					const currentIndex = get()._getCurrentIndex()
					if (currentIndex !== -1) get().skipToTrack(currentIndex)
					return
				}

				if (isPlaying) {
					await TrackPlayer.pause()
				} else {
					const isExpired = checkBilibiliAudioExpiry(currentTrack)
					if (!isExpired) {
						await TrackPlayer.play()
						set({ isPlaying: true })
						return
					}

					playerLog.debug('音频流已过期, 正在更新...')
					const result = await get().patchMetadataAndAudio(currentTrack)
					if (result.isErr()) {
						playerLog.sentry('更新音频流失败', result.error)
						return
					}

					const { needsUpdate, track } = result.value
					if (needsUpdate) {
						const { position } = await TrackPlayer.getProgress()
						const rntpTrack = convertToRNTPTrack(track)
						if (rntpTrack.isErr()) {
							playerLog.sentry('转换为 RNTPTrack 失败', rntpTrack.error)
							return
						}
						await TrackPlayer.load(rntpTrack.value)
						await get().seekTo(position)
					}
					await TrackPlayer.play()
				}
				set({ isPlaying: !isPlaying })
			} catch (error) {
				playerLog.sentry('切换播放状态失败', error)
			}
		},

		skipToNext: async () => {
			const activeList = get()._getActiveList()
			const { repeatMode } = get()
			const currentIndex = get()._getCurrentIndex()

			if (currentIndex === -1 || activeList.length <= 1) {
				await TrackPlayer.pause()
				set({ isPlaying: false })
				return
			}

			let nextIndex = currentIndex + 1
			if (nextIndex >= activeList.length) {
				if (repeatMode === RepeatMode.Queue) {
					nextIndex = 0
				} else {
					await TrackPlayer.pause()
					set({ isPlaying: false })
					return
				}
			}
			await get().skipToTrack(nextIndex)
		},

		skipToPrevious: async () => {
			const activeList = get()._getActiveList()
			const currentIndex = get()._getCurrentIndex()
			if (currentIndex === -1 || activeList.length <= 1) return

			const previousIndex =
				currentIndex === 0 ? activeList.length - 1 : currentIndex - 1
			await get().skipToTrack(previousIndex)
		},

		seekTo: async (position: number) => {
			if (!checkPlayerReady()) return
			await TrackPlayer.seekTo(position)
		},

		toggleRepeatMode: async () => {
			const { repeatMode } = get()
			if (!checkPlayerReady()) return

			let newMode: RepeatMode
			// 在设置播放器的重复模式时，列表循环、关闭循环模式都设置为 Off，方便靠我们自己的逻辑管理
			if (repeatMode === RepeatMode.Off) {
				newMode = RepeatMode.Track
				await TrackPlayer.setRepeatMode(newMode)
			} else if (repeatMode === RepeatMode.Track) {
				newMode = RepeatMode.Queue
				await TrackPlayer.setRepeatMode(RepeatMode.Off)
			} else {
				newMode = RepeatMode.Off
				await TrackPlayer.setRepeatMode(RepeatMode.Off)
			}
			set({ repeatMode: newMode })
			playerLog.debug('重复模式已更改', { newMode })
		},

		toggleShuffleMode: () => {
			const { shuffleMode, orderedList, currentTrackKey } = get()
			if (!checkPlayerReady()) return

			const newShuffleMode = !shuffleMode
			if (newShuffleMode) {
				// 进入随机模式
				playerLog.debug('开启随机模式')
				const newShuffledList = [...orderedList]
				// Fisher-Yates shuffle
				for (let i = newShuffledList.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[newShuffledList[i], newShuffledList[j]] = [
						newShuffledList[j],
						newShuffledList[i],
					]
				}
				// 将当前歌曲放到随机列表的第一位
				if (currentTrackKey) {
					const idx = newShuffledList.indexOf(currentTrackKey)
					if (idx !== -1) {
						;[newShuffledList[0], newShuffledList[idx]] = [
							newShuffledList[idx],
							newShuffledList[0],
						]
					}
				}
				set({ shuffleMode: true, shuffledList: newShuffledList })
			} else {
				playerLog.debug('关闭随机模式')
				set({ shuffleMode: false, shuffledList: [] })
			}
		},

		resetStore: async () => {
			playerLog.debug('清空队列')
			if (!checkPlayerReady()) return
			await TrackPlayer.reset()
			set(initialState)
		},

		patchMetadataAndAudio: async (
			track: Track,
		): Promise<
			Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | unknown>
		> => {
			const oldKey = getTrackKey(track)

			try {
				let trackAfterMeta = track
				// 1. 获取元数据 (如果需要)
				if (!track.hasMetadata) {
					playerLog.debug('获取元数据', { id: track.id, cid: track.cid })
					const metadata = await bilibiliApi.getVideoDetails(track.id)
					if (metadata.isErr()) return err(metadata.error)

					trackAfterMeta = {
						...track,
						title: metadata.value.title,
						artist: metadata.value.owner.name,
						cover: metadata.value.pic,
						duration: metadata.value.duration,
						createTime: metadata.value.pubdate,
						cid: metadata.value.cid,
						hasMetadata: true,
					}

					const newKey = getTrackKey(trackAfterMeta)

					set(
						produce((state: PlayerState) => {
							// ✨ 处理 key 可能变化的关键逻辑
							if (oldKey !== newKey) {
								// 如果 key 变了，需要更新 key 列表和 tracks 字典
								const orderedIndex = state.orderedList.indexOf(oldKey)
								if (orderedIndex > -1) state.orderedList[orderedIndex] = newKey

								const shuffledIndex = state.shuffledList.indexOf(oldKey)
								if (shuffledIndex > -1)
									state.shuffledList[shuffledIndex] = newKey

								if (state.currentTrackKey === oldKey) {
									state.currentTrackKey = newKey
								}

								delete state.tracks[oldKey]
								state.tracks[newKey] = trackAfterMeta
							} else {
								// 如果 key 不变，直接更新
								state.tracks[oldKey] = trackAfterMeta
							}
						}),
					)
				}

				// 2. 获取和更新音频流
				const result = await checkAndUpdateAudioStream(trackAfterMeta)
				if (result.isErr()) return err(result.error)

				const { track: finalTrack, needsUpdate } = result.value
				if (needsUpdate) {
					// 这里 key 不会再变，因为 id 和 cid 不会再被修改
					const finalKey = getTrackKey(finalTrack)
					set(
						produce((state: PlayerState) => {
							state.tracks[finalKey] = finalTrack
						}),
					)
				}

				return ok({ track: finalTrack, needsUpdate })
			} catch (error) {
				return err(error)
			}
		},

		// ✨ REFACTORED: skipToTrack
		// 接口保持不变 (接收 index)，内部逻辑完全基于 key
		skipToTrack: async (index: number) => {
			const activeList = get()._getActiveList()

			if (!checkPlayerReady() || index < 0 || index >= activeList.length) {
				playerLog.debug('skipToTrack 索引超出范围', {
					index,
					queueSize: activeList.length,
				})
				return
			}

			const keyToPlay = activeList[index]
			const initialTrack = get().tracks[keyToPlay]

			if (!initialTrack) {
				playerLog.error('未找到指定 key 的曲目', { key: keyToPlay })
				return
			}

			playerLog.debug(
				`跳转到曲目: index=${index}, key=${keyToPlay}, title=${initialTrack.title}`,
			)
			set({ currentTrackKey: keyToPlay, isBuffering: true })

			// 1. 获取最新的元数据和音频流
			const updatedTrackResult = await get().patchMetadataAndAudio(initialTrack)
			if (updatedTrackResult.isErr()) {
				playerLog.sentry('更新音频流失败', updatedTrackResult.error)
				await TrackPlayer.pause()
				Toast.error('播放失败: 更新音频流失败', {
					/* ... */
				})
				return
			}

			// 2. 使用最终的、最新的 track 对象进行播放
			const finalTrack = updatedTrackResult.value.track
			const finalKey = getTrackKey(finalTrack) // 获取最终的 key

			const rntpTrackResult = convertToRNTPTrack(finalTrack)
			if (rntpTrackResult.isErr()) {
				// ... 错误处理
				return
			}

			// 3. 加载并上报
			await TrackPlayer.load(rntpTrackResult.value)
			reportPlaybackHistory(finalTrack).catch((error) =>
				playerLog.error('上报播放历史失败', error),
			)

			// 4. 更新最终状态
			set({
				currentTrackKey: finalKey, // 使用最终的 key，确保同步
				isPlaying: true,
				isBuffering: false,
			})

			// 5. 预加载
			get().preloadTracks(index)
		},
	}

	return store
})

export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
