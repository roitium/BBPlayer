import { BilibiliApiError } from '@/lib/api/bilibili/bilibili.errors'
import type { Track } from '@/types/core/media'
import type {
	addToQueueParams,
	PlayerState,
	PlayerStore,
} from '@/types/core/playerStore'
import log from '@/utils/log'
import { zustandStorage } from '@/utils/mmkv'
import {
	checkAndUpdateAudioStream,
	checkBilibiliAudioExpiry,
	convertToRNTPTrack,
	reportPlaybackHistory,
} from '@/utils/player'
import toast from '@/utils/toast'
import { produce } from 'immer'
import { err, ok, type Result } from 'neverthrow'
import TrackPlayer, {
	RepeatMode,
	usePlaybackState,
	useProgress,
} from 'react-native-track-player'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const playerLog = log.extend('PLAYER/STORE')

const checkPlayerReady = () => {
	if (!global.playerIsReady) {
		toast.error('播放器未初始化', { description: '请稍后再试' })
		return false
	}
	return true
}

/**
 * 播放器状态存储
 * 采用 zustand 自己维护一个 queue，rntp 仅用于播放当前的 track，通过 TrackPlayer.load 来替换当前播放的内容，所有队列操作都通过该 store 进行
 */
export const usePlayerStore = create<PlayerStore>()(
	persist(
		(set, get) => {
			const initialState: PlayerState = {
				tracks: {},
				orderedList: [],
				shuffledList: [],
				currentTrackId: null,
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
					const { tracks, currentTrackId: currentTrackKey } = get()
					return currentTrackKey ? (tracks[currentTrackKey] ?? null) : null
				},

				_getCurrentIndex: (): number => {
					const { currentTrackId } = get()
					if (!currentTrackId) return -1
					return get()._getActiveList().indexOf(currentTrackId)
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

				removeTrack: async (id: string) => {
					playerLog.debug('removeTrack()', { id })
					const { tracks, currentTrackId: initialCurrentKey } = get()

					// // 根据 id 和 cid 找到 key
					// const keyToRemove = Object.keys(tracks).find((key) => {
					// 	const track = tracks[key]
					// 	return track.id === id && (!track.isMultiPage || track.cid === cid)
					// })
					const numberId = Number(id)
					const keyToRemove = Object.keys(tracks).find((key) => {
						const track = tracks[key]
						return track.id === numberId
					})

					if (!keyToRemove) {
						toast.error('播放器异常', { description: '找不到该曲目' })
						return
					}

					if (initialCurrentKey !== keyToRemove) {
						set(
							produce((state: PlayerState) => {
								delete state.tracks[keyToRemove]
								const orderedIndex = state.orderedList.indexOf(keyToRemove)
								if (orderedIndex > -1) state.orderedList.splice(orderedIndex, 1)
								const shuffledIndex = state.shuffledList.indexOf(keyToRemove)
								if (shuffledIndex > -1)
									state.shuffledList.splice(shuffledIndex, 1)
							}),
						)
						return
					}

					// 只有在删除当前正在播放的歌曲时，才需要复杂的处理
					const activeList = get()._getActiveList()

					// 如果是最后一首歌
					if (activeList.length === 1) {
						await get().resetStore()
						return
					}

					const currentIndex = activeList.indexOf(keyToRemove)
					const isLastTrack = currentIndex === activeList.length - 1

					const nextIndexToPlayInOldList = isLastTrack
						? currentIndex - 1
						: currentIndex + 1
					const nextTrackKeyToPlay = activeList[nextIndexToPlayInOldList]

					set(
						produce((state: PlayerState) => {
							// 删除 track 数据
							delete state.tracks[keyToRemove]

							// 从顺序列表中删除
							const orderedIndex = state.orderedList.indexOf(keyToRemove)
							if (orderedIndex > -1) state.orderedList.splice(orderedIndex, 1)

							// 从随机列表中删除
							const shuffledIndex = state.shuffledList.indexOf(keyToRemove)
							if (shuffledIndex > -1)
								state.shuffledList.splice(shuffledIndex, 1)

							state.currentTrackId = nextTrackKeyToPlay
						}),
					)

					const newActiveList = get()._getActiveList()
					const finalIndexToPlay = newActiveList.indexOf(nextTrackKeyToPlay)

					if (finalIndexToPlay !== -1) {
						await get().skipToTrack(finalIndexToPlay)
					} else {
						await get().resetStore()
					}
				},

				/**
				 * 添加多条曲目到队列
				 * 当 playNow 为 false 时，startFromId 不生效
				 * 提供
				 * @param tracks
				 * @param playNow 是否立即播放（在 startFromId 为空时是播放新增队列的第一首歌曲）
				 * @param clearQueue
				 * @param startFromKey 从指定 key 开始播放
				 * @param playNext （仅在 playNow 为 false 时）是否把新曲目插入到当前播放曲目的后面
				 * @returns
				 */
				addToQueue: async ({
					tracks,
					playNow,
					clearQueue,
					startFromId,
					playNext,
				}: addToQueueParams) => {
					if (!checkPlayerReady() || tracks.length === 0) return
					if (clearQueue) await get().resetStore()

					const existingTracks = get().tracks
					// 找出需要新加入的 tracks
					const newTracks = tracks.filter((track) => !existingTracks[track.id])

					// 没有新歌加入，但需要跳转播放
					if (newTracks.length === 0) {
						if (playNow && startFromId) {
							// 直接在当前播放列表中找到 key 对应的索引
							const targetIndex = get()._getActiveList().indexOf(startFromId)
							if (targetIndex !== -1) {
								await get().skipToTrack(targetIndex)
							} else {
								playerLog.warn('指定的 startFromId 在当前队列中不存在', {
									key: startFromId,
								})
							}
						}
						return
					}

					// 有新歌加入
					const newKeys = newTracks.map((track) => String(track.id))
					set(
						produce((state: PlayerState) => {
							// 1. 把新歌数据加进去
							newTracks.forEach((track, i) => {
								state.tracks[newKeys[i]] = track
							})

							// 2. 计算插入位置
							const currentKey = state.currentTrackId
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
								// 默认播放新列表的第一首
								let keyToPlay = newKeys[0]

								// 如果提供了 startFromKey，并且这个 key 属于本次新添加的歌曲，则使用它
								if (startFromId && newKeys.includes(startFromId)) {
									keyToPlay = startFromId
								}
								state.currentTrackId = keyToPlay
							} else if (
								!state.currentTrackId &&
								state.orderedList.length > 0
							) {
								state.currentTrackId = state.orderedList[0]
							}
						}),
					)

					if (playNow) {
						const keyToPlay = get().currentTrackId
						if (!keyToPlay) {
							playerLog.error('播放器异常，无法找到当前播放的 key')
							return
						}
						const indexToPlay = get()._getActiveList().indexOf(keyToPlay)
						if (indexToPlay !== -1) {
							await get().skipToTrack(indexToPlay)
						}
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
							const result = await get().patchAudio(currentTrack)
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
					const {
						shuffleMode,
						orderedList,
						currentTrackId: currentTrackKey,
					} = get()
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
					set((state) => ({ ...initialState, repeatMode: state.repeatMode }))
				},

				patchAudio: async (
					track: Track,
				): Promise<
					Result<
						{ track: Track; needsUpdate: boolean },
						BilibiliApiError | unknown
					>
				> => {
					// const oldKey = String(track.id)

					try {
						// 新的架构不会出现 metadata 为空的情况
						// let trackAfterMeta = track
						// // 1. 获取元数据 (如果需要)
						// if (!track.bilibiliMetadata.) {
						// 	playerLog.debug('获取元数据', { id: track.id, cid: track.cid })
						// 	const metadata = await bilibiliApi.getVideoDetails(track.id)
						// 	if (metadata.isErr()) return err(metadata.error)

						// 	trackAfterMeta = {
						// 		...track,
						// 		title: metadata.value.title,
						// 		artist: metadata.value.owner.name,
						// 		coverUrl: metadata.value.pic,
						// 		duration: metadata.value.duration,
						// 		createAt: metadata.value.pubdate,
						// 		cid: metadata.value.cid,
						// 		hasMetadata: true,
						// 	}

						// 	const newKey = getTrackKey(trackAfterMeta)

						// 	set(
						// 		produce((state: PlayerState) => {
						// 			// ✨ 处理 key 可能变化的关键逻辑
						// 			if (oldKey !== newKey) {
						// 				// 如果 key 变了，需要更新 key 列表和 tracks 字典
						// 				const orderedIndex = state.orderedList.indexOf(oldKey)
						// 				if (orderedIndex > -1)
						// 					state.orderedList[orderedIndex] = newKey

						// 				const shuffledIndex = state.shuffledList.indexOf(oldKey)
						// 				if (shuffledIndex > -1)
						// 					state.shuffledList[shuffledIndex] = newKey

						// 				if (state.currentTrackId === oldKey) {
						// 					state.currentTrackId = newKey
						// 				}

						// 				delete state.tracks[oldKey]
						// 				state.tracks[newKey] = trackAfterMeta
						// 			} else {
						// 				// 如果 key 不变，直接更新
						// 				state.tracks[oldKey] = trackAfterMeta
						// 			}
						// 		}),
						// 	)
						// }

						// 2. 获取和更新音频流
						const result = await checkAndUpdateAudioStream(track)
						if (result.isErr()) return err(result.error)

						const { track: finalTrack, needsUpdate } = result.value
						if (needsUpdate) {
							set(
								produce((state: PlayerState) => {
									state.tracks[track.id] = finalTrack
								}),
							)
						}

						return ok({ track: finalTrack, needsUpdate })
					} catch (error) {
						return err(error)
					}
				},

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
					set({ currentTrackId: keyToPlay, isBuffering: true })

					// 1. 获取最新的音频流
					const updatedTrackResult = await get().patchAudio(initialTrack)
					if (updatedTrackResult.isErr()) {
						playerLog.sentry('更新音频流失败', updatedTrackResult.error)
						await TrackPlayer.pause()
						toast.error('播放失败: 更新音频流失败', {
							description: String(updatedTrackResult.error),
						})
						return
					}

					// 2. 使用最终的、最新的 track 对象进行播放
					const finalTrack = updatedTrackResult.value.track

					const rntpTrackResult = convertToRNTPTrack(finalTrack)
					if (rntpTrackResult.isErr()) {
						playerLog.sentry('转换为 RNTPTrack 失败', rntpTrackResult.error)
						return
					}

					await TrackPlayer.load(rntpTrackResult.value)
					await TrackPlayer.play()
					reportPlaybackHistory(finalTrack).catch((error) =>
						playerLog.error('上报播放历史失败', error),
					)

					set({
						currentTrackId: String(finalTrack.id),
						isPlaying: true,
						isBuffering: false,
					})
				},
			}

			return store
		},
		{
			name: 'player-storage',
			storage: createJSONStorage(() => zustandStorage),
			partialize: (state) => ({ repeatMode: state.repeatMode }),
		},
	),
)

export const usePlaybackProgress = useProgress
export const usePlaybackStateHook = usePlaybackState
