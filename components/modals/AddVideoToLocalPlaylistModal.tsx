import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { Button, Checkbox, Dialog, Text, useTheme } from 'react-native-paper'

import { useUpdateTrackLocalPlaylists } from '@/hooks/mutations/db/playlist'
import {
	usePlaylistLists,
	usePlaylistsContainingTrack,
} from '@/hooks/queries/db/usePlaylist'
import { artistService } from '@/lib/services/artistService'
import type { Playlist, Track } from '@/types/core/media'
import { flatErrorMessage } from '@/utils/error'
import log from '@/utils/log'
import toast from '@/utils/toast'
import { AnimatedModal } from '../modal'

const logger = log.extend('Modals/AddVideoToLocalPlaylistModal')

const PlaylistListItem = memo(function PlaylistListItem({
	id,
	title,
	isChecked,
	isDisabled,
	onPress,
}: {
	id: number
	title: string
	onPress: (id: number) => void
	isChecked: boolean
	isDisabled: boolean
}) {
	const handlePress = useCallback(() => {
		onPress(id)
	}, [id, onPress])

	return (
		<Checkbox.Item
			label={title}
			status={isChecked ? 'checked' : 'unchecked'}
			onPress={handlePress}
			disabled={isDisabled}
		/>
	)
})
PlaylistListItem.displayName = 'PlaylistListItem'

const AddVideoToLocalPlaylistModal = memo(
	function AddVideoToLocalPlaylistModal({
		track,
		visible,
		setVisible,
	}: {
		track: Track
		visible: boolean
		setVisible: (visible: boolean) => void
	}) {
		const { colors } = useTheme()

		const {
			data: allPlaylists,
			isPending: isPlaylistsPending,
			isError: isPlaylistsError,
			refetch: refetchPlaylists,
		} = usePlaylistLists()

		const {
			data: playlistsContainingTrack,
			isPending: isContainingTrackPending,
			isError: isContainingTrackError,
			refetch: refetchContainingTrack,
		} = usePlaylistsContainingTrack(track.id)

		const { mutate: updateTracks, isPending: isMutating } =
			useUpdateTrackLocalPlaylists()

		const [checkedPlaylistIds, setCheckedPlaylistIds] = useState<number[]>([])

		// 组合加载和错误状态
		const isLoading = isPlaylistsPending || isContainingTrackPending
		const isError = isPlaylistsError || isContainingTrackError

		const initialCheckedPlaylistIdSet = useMemo(() => {
			if (!playlistsContainingTrack) return new Set<number>()
			return new Set(playlistsContainingTrack.map((p) => p.id))
		}, [playlistsContainingTrack])
		const initialCheckedPlaylistIdList = Array.from(initialCheckedPlaylistIdSet)

		useEffect(() => {
			// 初始化组件的勾选状态
			setCheckedPlaylistIds(initialCheckedPlaylistIdList)
		}, [initialCheckedPlaylistIdList])

		const shouldEnforceSingleItemRule = initialCheckedPlaylistIdSet.size > 0

		const handleCheckboxPress = useCallback((playlistId: number) => {
			setCheckedPlaylistIds((currentIds) => {
				const isCurrentlyChecked = currentIds.includes(playlistId)
				if (isCurrentlyChecked) {
					return currentIds.filter((id) => id !== playlistId)
				} else {
					return [...currentIds, playlistId]
				}
			})
		}, [])

		const handleConfirm = useCallback(async () => {
			if (isMutating) return

			const currentCheckedIds = new Set(checkedPlaylistIds)

			const toAddPlaylistIds = [...currentCheckedIds].filter(
				(id) => !initialCheckedPlaylistIdSet.has(id),
			)
			const toRemovePlaylistIds = [...initialCheckedPlaylistIdSet].filter(
				(id) => !currentCheckedIds.has(id),
			)

			if (toAddPlaylistIds.length === 0 && toRemovePlaylistIds.length === 0) {
				setVisible(false)
				return
			}

			let artistId
			if (track.artist) {
				artistId = await artistService.findOrCreateArtist({
					name: track.artist.name,
					source: track.artist.source,
					remoteId: track.artist.remoteId,
					avatarUrl: track.artist.avatarUrl,
					signature: track.artist.signature,
				})
				if (artistId.isErr()) {
					toast.error('查询或创建歌手失败', {
						description: flatErrorMessage(artistId.error),
						duration: Number.POSITIVE_INFINITY,
					})
					logger.error('查询或创建歌手失败: ', flatErrorMessage(artistId.error))
					return
				}
			}
			logger.debug(
				'查询或创建该 track 对应的 artist 完成：',
				artistId?.value.id,
			)
			updateTracks({
				toAddPlaylistIds,
				toRemovePlaylistIds,
				trackPayload: {
					...track,
					artistId: artistId?.value.id,
				},
			})
			logger.debug('更新本地播放列表完成')
			setVisible(false)
		}, [
			isMutating,
			checkedPlaylistIds,
			initialCheckedPlaylistIdSet,
			updateTracks,
			track,
			setVisible,
		])

		const handleDismiss = () => {
			if (isMutating) return
			setVisible(false)
		}

		const handleRetry = () => {
			if (isPlaylistsError) void refetchPlaylists()
			if (isContainingTrackError) void refetchContainingTrack()
		}

		const renderPlaylistItem = useCallback(
			({ item }: { item: Playlist }) => {
				const isChecked = checkedPlaylistIds.includes(item.id)
				const isDisabled =
					item.type !== 'local' ||
					(shouldEnforceSingleItemRule &&
						isChecked &&
						checkedPlaylistIds.length === 1)

				return (
					<PlaylistListItem
						id={item.id}
						title={item.title}
						onPress={handleCheckboxPress}
						isChecked={isChecked}
						isDisabled={isDisabled}
					/>
				)
			},
			[checkedPlaylistIds, handleCheckboxPress, shouldEnforceSingleItemRule],
		)

		const keyExtractor = useCallback((item: Playlist) => item.id.toString(), [])

		const renderContent = () => {
			if (isLoading) {
				return (
					<Dialog.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
						<ActivityIndicator size={'large'} />
					</Dialog.Content>
				)
			}

			if (isError) {
				return (
					<>
						<Dialog.Content>
							<Text style={{ textAlign: 'center', color: colors.error }}>
								加载歌单列表失败
							</Text>
						</Dialog.Content>
						<Dialog.Actions>
							<Button onPress={handleDismiss}>关闭</Button>
							<Button onPress={handleRetry}>重试</Button>
						</Dialog.Actions>
					</>
				)
			}

			return (
				<>
					<Dialog.Content>
						<FlatList
							data={allPlaylists || []}
							renderItem={renderPlaylistItem}
							keyExtractor={keyExtractor}
							extraData={checkedPlaylistIds}
							style={{ height: 300 }}
							ListEmptyComponent={
								<View
									style={{
										flex: 1,
										justifyContent: 'center',
										alignItems: 'center',
									}}
								>
									<Text style={{ padding: 16 }}>你还没有创建任何歌单</Text>
								</View>
							}
						/>
						<Text
							variant='bodySmall'
							style={{ padding: 16 }}
						>
							* 与远程同步的播放列表无法选择
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button
							onPress={handleDismiss}
							disabled={isMutating}
						>
							取消
						</Button>
						<Button
							onPress={handleConfirm}
							loading={isMutating}
							disabled={isMutating}
						>
							确认
						</Button>
					</Dialog.Actions>
				</>
			)
		}

		return (
			<AnimatedModal
				visible={visible}
				onDismiss={handleDismiss}
			>
				<Dialog.Title>添加到歌单</Dialog.Title>
				{renderContent()}
			</AnimatedModal>
		)
	},
)

AddVideoToLocalPlaylistModal.displayName = 'AddVideoToLocalPlaylistModal'

export default AddVideoToLocalPlaylistModal
