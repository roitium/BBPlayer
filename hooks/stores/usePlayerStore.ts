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
		queue: [],
		currentIndex: -1,
		currentTrack: null,
		isPlaying: false,
		isBuffering: false,
		repeatMode: RepeatMode.Off,
		shuffleMode: false,
		shuffledQueue: [],
	}

	const store = {
		...initialState,

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
			const { queue, shuffledQueue, shuffleMode, currentTrack } = get()
			const currentQueue = shuffleMode ? shuffledQueue : queue
			if (currentTrack?.id === id && currentTrack?.cid === cid) {
				if (currentQueue.length === 1) {
					playerLog.debug('队列只有一首歌曲，清空队列并停止播放')
					set(
						produce((state: PlayerState) => {
							state.queue = []
							state.currentIndex = -1
							state.currentTrack = null
							state.isPlaying = false
							state.shuffledQueue = []
						}),
					)
					await TrackPlayer.stop()
					await TrackPlayer.remove([0])
					return
				}
				const lastTrack = currentQueue.at(-1)
				if (lastTrack) {
					if (lastTrack.id === id && lastTrack.cid === cid) {
						await get().skipToPrevious()
					} else {
						await get().skipToNext()
					}
				}
			}
			const queueIndex = queue.findIndex((t) => t.id === id && t.cid === cid)
			if (queueIndex === -1) {
				Toast.error('播放器异常', {
					description: '在播放列表中找不到该曲目，已重置播放器',
				})
				await get().clearQueue()
				return
			}
			const shuffledQueueIndex = shuffledQueue.findIndex(
				(t) => t.id === id && t.cid === cid,
			)
			// 当没有开启过随机模式时，shuffledQueue 为空，所以在判断 shuffledQueueIndex 时还需要判断列表不为空
			if (shuffledQueueIndex === -1 && shuffledQueue.length > 0) {
				Toast.error('播放器异常', {
					description: '在播放列表中找不到该曲目，已重置播放器',
				})
				await get().clearQueue()
				return
			}
			set(
				produce((state: PlayerState) => {
					state.queue.splice(queueIndex, 1)
					state.shuffledQueue.splice(shuffledQueueIndex, 1)
				}),
			)
		},

		/**
		 * 添加多条曲目到队列
		 * 当 playNow 为 false 时，startFromId 不生效
		 * @param tracks
		 * @param playNow 是否立即播放（在 startFromId 为空时是播放新增队列的第一首歌曲）
		 * @param clearQueue
		 * @param startFromId 从指定 id 开始播放
		 * @param startFromCid 从指定 cid 开始播放
		 * @param playNext （仅在 playNow 为 false 时）是否把新曲目插入到当前播放曲目的后面
		 * @returns
		 */
		addToQueue: async ({
			tracks,
			playNow,
			clearQueue,
			startFromId,
			startFromCid,
			playNext,
		}: addToQueueParams) => {
			playerLog.debug('addToQueue()', {
				tracksCount: tracks.length,
				playNow,
				clearQueue,
				playNext,
			})

			if (!checkPlayerReady()) return
			if (tracks.length === 0) return
			if (playNow && playNext) {
				playerLog.error('playNow 和 playNext 不能同时为 true')
				return
			}
			if (startFromCid && startFromId) {
				playerLog.error('startFromCid 和 startFromId 不能同时填写')
				return
			}

			if (clearQueue) {
				await get().clearQueue()
			}

			const newTracks = tracks.filter(
				(track) =>
					!get().queue.some((t) => isTargetTrack(t, track.id, track.cid)),
			)

			if (newTracks.length === 0) {
				playerLog.debug('无新曲目需要添加')
				const switchTrackPipe = async (targetIndex: number) => {
					set(
						produce((state: PlayerState) => {
							state.currentIndex = targetIndex
							const queue = state.shuffleMode
								? state.shuffledQueue
								: state.queue
							state.currentTrack = queue[targetIndex]
						}),
					)
					await get().skipToTrack(targetIndex)
					await TrackPlayer.play()
					set({ isPlaying: true })
				}

				if (playNow && (startFromId || startFromCid)) {
					if (get().shuffleMode) {
						const targetIndex = get().shuffledQueue.findIndex((t) =>
							isTargetTrack(t, startFromId, startFromCid),
						)
						if (targetIndex !== -1) {
							await switchTrackPipe(targetIndex)
						}
					} else {
						const targetIndex = get().queue.findIndex((t) =>
							isTargetTrack(t, startFromId, startFromCid),
						)
						if (targetIndex !== -1) {
							await switchTrackPipe(targetIndex)
						}
					}
				} else if (playNow) {
					// 如果没有指定播放新曲目，则播放新队列的第一首(在现有队列中寻找)
					const targetIndex = get().queue.findIndex((t) =>
						isTargetTrack(t, tracks[0].id, tracks[0].cid),
					)
					if (targetIndex !== -1) {
						await switchTrackPipe(targetIndex)
					}
				}
				return
			}

			set(
				produce((state: PlayerState) => {
					let insertIndexForQueue = state.queue.length // 默认为队列末尾
					if (playNext && state.currentIndex !== -1) {
						insertIndexForQueue = state.currentIndex + 1
					}
					state.queue.splice(insertIndexForQueue, 0, ...newTracks)

					if (state.shuffleMode) {
						let insertIndexForShuffled = state.shuffledQueue.length
						if (
							playNext &&
							state.currentIndex !== -1 &&
							state.shuffledQueue.length > state.currentIndex
						) {
							insertIndexForShuffled = state.currentIndex + 1
						}
						state.shuffledQueue.splice(insertIndexForShuffled, 0, ...newTracks)
					}

					if (playNow) {
						let newPlayIndex = -1
						if (startFromCid) {
							newPlayIndex = state.queue.findIndex(
								(t) => t.cid === startFromCid,
							)
						} else if (startFromId) {
							newPlayIndex = state.queue.findIndex((t) => t.id === startFromId)
						} else {
							// 播放新添加内容的第一首
							newPlayIndex = insertIndexForQueue
						}

						if (newPlayIndex === -1 && newTracks.length > 0) {
							// 按道理这不会发生，但还是做一下处理
							newPlayIndex = state.queue.findIndex((t) =>
								isTargetTrack(t, newTracks[0].id, newTracks[0].cid),
							)
						}

						if (newPlayIndex !== -1) {
							state.currentIndex = newPlayIndex
							state.currentTrack = state.queue[newPlayIndex]
						} else if (state.queue.length > 0) {
							// 这也不该发生，继续兜底
							state.currentIndex = 0
							state.currentTrack = state.queue[0]
						}
					} else if (state.currentTrack === null && state.queue.length > 0) {
						// 设置队列第一首为当前播放
						state.currentIndex = 0
						state.currentTrack = state.queue[0]
					}
				}),
			)

			if (playNow) {
				const currentStore = get()
				if (currentStore.currentIndex !== -1) {
					await currentStore.skipToTrack(currentStore.currentIndex)
					await TrackPlayer.play()
					set({ isPlaying: true })
				}
			}
		},

		// 预加载
		preloadTracks: async (index: number) => {
			const { queue, shuffleMode, shuffledQueue } = get()
			const currentQueue = shuffleMode ? shuffledQueue : queue

			// 预加载当前播放歌曲的后 n 首
			const preloadStartIndex = index + 1
			const preloadEndIndex = Math.min(
				preloadStartIndex + PRELOAD_TRACKS,
				currentQueue.length,
			)
			const tracksToPreload = currentQueue.slice(
				preloadStartIndex,
				preloadEndIndex,
			)

			if (tracksToPreload.length > 0) {
				playerLog.debug(`开始预加载 ${tracksToPreload.length} 首曲目`)
				await Promise.all(
					tracksToPreload.map((track) => get().patchMetadataAndAudio(track)),
				)
			}
		},

		// 切换播放/暂停
		togglePlay: async () => {
			const {
				isPlaying,
				currentTrack,
				skipToTrack,
				currentIndex,
				rntpQueue,
				patchMetadataAndAudio,
				seekTo,
			} = get()

			if (!checkPlayerReady()) return
			if (!currentTrack) return

			try {
				if (!(await rntpQueue()).length) {
					playerLog.debug('rntp 队列为空, 尝试重新加载当前曲目')
					if (currentTrack) {
						skipToTrack(currentIndex)
					}
					return // skipToTrack will handle playback
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
					const result = await patchMetadataAndAudio(currentTrack)
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
						await seekTo(position)
					}
					await TrackPlayer.play()
				}
				set({ isPlaying: !isPlaying })
			} catch (error) {
				playerLog.sentry('切换播放状态失败', error)
			}
		},

		skipToNext: async () => {
			const { queue, currentIndex, shuffleMode, repeatMode, shuffledQueue } =
				get()

			if (!checkPlayerReady()) return

			try {
				const currentQueue = shuffleMode ? shuffledQueue : queue

				if (currentQueue.length <= 1) {
					playerLog.debug('队列中曲目不足, 无法跳转下一首')
					await TrackPlayer.pause()
					set({ isPlaying: false })
					return
				}

				let nextIndex: number
				if (repeatMode === RepeatMode.Queue) {
					nextIndex = (currentIndex + 1) % currentQueue.length
				} else {
					nextIndex = currentIndex + 1
					if (nextIndex >= currentQueue.length) {
						playerLog.debug('已到达最后一首, 停止播放')
						await TrackPlayer.pause()
						set({ isPlaying: false })
						return
					}
				}
				await get().skipToTrack(nextIndex)
			} catch (error) {
				playerLog.sentry('跳转到下一曲失败', error)
			}
		},

		skipToPrevious: async () => {
			const { queue, currentIndex, shuffleMode, shuffledQueue } = get()

			if (!checkPlayerReady()) return

			try {
				const currentQueue = shuffleMode ? shuffledQueue : queue

				if (currentQueue.length <= 1) {
					playerLog.debug('队列中曲目不足, 无法跳转上一首')
					return
				}

				// 由于在切换 shuffle 模式时已经包含了重新定位当前曲目的逻辑，所以这里不需要再把目标索引同步到另一个 queue 中
				const previousIndex =
					currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1

				await get().skipToTrack(previousIndex)
			} catch (error) {
				playerLog.sentry('跳转到上一曲失败', error)
			}
		},

		seekTo: async (position: number) => {
			if (!checkPlayerReady()) return

			try {
				await TrackPlayer.seekTo(position)
			} catch (error) {
				playerLog.sentry('跳转到指定位置失败', error)
			}
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
			const { shuffleMode, queue, currentIndex } = get()
			if (!checkPlayerReady()) return

			if (shuffleMode) {
				playerLog.debug('关闭随机模式')
				set(
					produce((state: PlayerState) => {
						state.shuffleMode = false
						if (state.currentTrack) {
							const currentTrack = state.currentTrack
							state.currentIndex = state.queue.findIndex((track) =>
								isTargetTrack(track, currentTrack.id, currentTrack.cid),
							)
						}
						state.shuffledQueue = []
					}),
				)
			} else {
				playerLog.debug('开启随机模式')
				const shuffledQueue = [...queue]
				for (let i = shuffledQueue.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[shuffledQueue[i], shuffledQueue[j]] = [
						shuffledQueue[j],
						shuffledQueue[i],
					]
				}

				const currentTrackIndex = shuffledQueue.findIndex((track) =>
					isTargetTrack(track, queue[currentIndex].id, queue[currentIndex].cid),
				)
				if (currentTrackIndex !== -1) {
					;[shuffledQueue[0], shuffledQueue[currentTrackIndex]] = [
						shuffledQueue[currentTrackIndex],
						shuffledQueue[0],
					]
				}

				set(
					produce((state: PlayerState) => {
						state.shuffleMode = true
						state.shuffledQueue = shuffledQueue
						state.currentIndex = 0
					}),
				)
			}
		},

		clearQueue: async () => {
			playerLog.debug('清空队列')
			if (!checkPlayerReady()) return

			try {
				await TrackPlayer.reset()
				set(
					produce((store) => {
						store.queue = []
						store.currentIndex = -1
						store.currentTrack = null
						store.isPlaying = false
						store.shuffledQueue = []
						store.isBuffering = false
					}),
				)
			} catch (error) {
				playerLog.sentry('清空队列失败', error)
			}
		},

		patchMetadataAndAudio: async (
			track: Track,
		): Promise<
			Result<{ track: Track; needsUpdate: boolean }, BilibiliApiError | unknown>
		> => {
			let updatedTrack = track
			try {
				if (!track.hasMetadata) {
					playerLog.debug(`获取元数据: id=${track.id}, cid=${track.cid}`)
					const metadata = await bilibiliApi.getVideoDetails(track.id)
					if (metadata.isErr()) {
						playerLog.sentry('获取元数据失败', metadata.error)
						return err(metadata.error)
					}
					updatedTrack = {
						...track,
						title: metadata.value.title,
						artist: metadata.value.owner.name,
						cover: metadata.value.pic,
						duration: metadata.value.duration,
						createTime: metadata.value.pubdate,
						cid: metadata.value.cid,
						hasMetadata: true,
					}

					set(
						produce((state: PlayerState) => {
							const queueIndex = state.queue.findIndex((t) =>
								isTargetTrack(t, updatedTrack.id, updatedTrack.cid),
							)
							if (queueIndex !== -1) {
								state.queue[queueIndex] = updatedTrack
							}
							const shuffledQueueIndex = state.shuffledQueue.findIndex((t) =>
								isTargetTrack(t, updatedTrack.id, updatedTrack.cid),
							)
							if (shuffledQueueIndex !== -1) {
								state.shuffledQueue[shuffledQueueIndex] = updatedTrack
							}
						}),
					)
				}
				const result = await checkAndUpdateAudioStream(updatedTrack)
				if (result.isErr()) {
					return err(result.error)
				}
				const { track: finalTrack, needsUpdate } = result.value
				if (needsUpdate) {
					set(
						produce((state: PlayerState) => {
							const queueIndex = state.queue.findIndex((t) =>
								isTargetTrack(t, finalTrack.id, finalTrack.cid),
							)
							if (queueIndex !== -1) {
								state.queue[queueIndex] = finalTrack
							}
							const shuffledQueueIndex = state.shuffledQueue.findIndex((t) =>
								isTargetTrack(t, finalTrack.id, finalTrack.cid),
							)
							if (shuffledQueueIndex !== -1) {
								state.shuffledQueue[shuffledQueueIndex] = finalTrack
							}
						}),
					)
				}
				return ok({ track: finalTrack, needsUpdate: true })
			} catch (error) {
				return err(error)
			}
		},

		skipToTrack: async (index: number) => {
			const { shuffleMode, shuffledQueue, queue } = get()
			const currentQueue = shuffleMode ? shuffledQueue : queue

			if (!checkPlayerReady()) return
			if (index < 0 || index >= currentQueue.length) {
				playerLog.debug('skipToTrack 索引超出范围', {
					index,
					queueSize: currentQueue.length,
				})
				return
			}

			const track = currentQueue[index]
			if (!track) {
				playerLog.debug('未找到指定索引的曲目', { index })
				return
			}

			playerLog.debug(`跳转到曲目: index=${index}, title=${track.title}`)
			if (track.hasMetadata) {
				set({ currentTrack: track, isBuffering: true, currentIndex: index })
			}

			const updatedTrackResult = await get().patchMetadataAndAudio(track)
			if (updatedTrackResult.isErr()) {
				playerLog.sentry('更新音频流失败', updatedTrackResult.error)
				TrackPlayer.pause()
				Toast.error('播放失败: 更新音频流失败', {
					description: `id: ${track.id}，错误：${updatedTrackResult.error}`,
					duration: Number.POSITIVE_INFINITY,
				})
				return
			}
			const updatedTrack = updatedTrackResult.value.track

			const rntpTrackResult = convertToRNTPTrack(updatedTrack)
			if (rntpTrackResult.isErr()) {
				playerLog.sentry('转换为 RNTP 对象失败', rntpTrackResult.error)
				TrackPlayer.pause()
				Toast.error('播放失败: 转换播放器对象失败', {
					description: `id: ${updatedTrack.id}，错误：${rntpTrackResult.error}`,
					duration: Number.POSITIVE_INFINITY,
				})
				return
			}
			await TrackPlayer.load(rntpTrackResult.value)
			reportPlaybackHistory(updatedTrack).catch((error) =>
				playerLog.error('上报播放历史失败 (捕获到非预期错误)', error),
			)

			set(
				produce((state: PlayerState) => {
					state.currentIndex = index
					state.currentTrack = updatedTrack
				}),
			)
			get().preloadTracks(index)
		},
	}

	return store
})

export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
