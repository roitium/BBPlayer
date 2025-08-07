import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, View } from 'react-native'
import {
	Button,
	Checkbox,
	Dialog,
	Portal,
	Text,
	useTheme,
} from 'react-native-paper'

import {
	usePlaylistLists,
	usePlaylistsContainingTrack,
	useUpdateLocalPlaylistTracks,
} from '@/hooks/queries/db/usePlaylist'
import type { Playlist, Track } from '@/types/core/media'

const PlaylistListItem = memo(function PlaylistListItem({
	id,
	title,
	type,
	checkedIds,
	setCheckedIds,
}: {
	id: number
	title: string
	type: Playlist['type']
	checkedIds: number[]
	setCheckedIds: (ids: number[]) => void
}) {
	const isDisabled = type !== 'local'
	const isChecked = checkedIds.includes(id)

	const handlePress = useCallback(() => {
		if (isDisabled) return

		setCheckedIds(
			isChecked
				? checkedIds.filter((checkedId) => checkedId !== id)
				: [...checkedIds, id],
		)
	}, [isChecked, checkedIds, id, isDisabled, setCheckedIds])

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

// --- 重构后的主组件 ---
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

		const { mutateAsync: updateTracks, isPending: isMutating } =
			useUpdateLocalPlaylistTracks()

		const [checkedPlaylistIds, setCheckedPlaylistIds] = useState<number[]>([])

		// 组合加载和错误状态
		const isLoading = isPlaylistsPending || isContainingTrackPending
		const isError = isPlaylistsError || isContainingTrackError

		const initialCheckedPlaylistIds = useMemo(() => {
			if (!playlistsContainingTrack) return new Set<number>()
			return new Set(playlistsContainingTrack.map((p) => p.id))
		}, [playlistsContainingTrack])

		useEffect(() => {
			// 初始化组件的勾选状态
			setCheckedPlaylistIds(Array.from(initialCheckedPlaylistIds))
		}, [initialCheckedPlaylistIds])

		const handleConfirm = useCallback(async () => {
			if (isMutating) return

			const currentCheckedIds = new Set(checkedPlaylistIds)

			const toAddPlaylistIds = [...currentCheckedIds].filter(
				(id) => !initialCheckedPlaylistIds.has(id),
			)
			const toRemovePlaylistIds = [...initialCheckedPlaylistIds].filter(
				(id) => !currentCheckedIds.has(id),
			)

			if (toAddPlaylistIds.length === 0 && toRemovePlaylistIds.length === 0) {
				setVisible(false)
				return
			}
			await updateTracks({
				toAddPlaylistIds,
				toRemovePlaylistIds,
				trackId: track.id,
			})
			setVisible(false)
		}, [
			isMutating,
			checkedPlaylistIds,
			initialCheckedPlaylistIds,
			updateTracks,
			setVisible,
			track.id,
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
			({ item }: { item: Playlist }) => (
				<PlaylistListItem
					id={item.id}
					title={item.title}
					type={item.type}
					checkedIds={checkedPlaylistIds}
					setCheckedIds={setCheckedPlaylistIds}
				/>
			),
			[checkedPlaylistIds],
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
			<Portal>
				<Dialog
					visible={visible}
					onDismiss={handleDismiss}
				>
					<Dialog.Title>添加到歌单</Dialog.Title>
					{renderContent()}
				</Dialog>
			</Portal>
		)
	},
)

AddVideoToLocalPlaylistModal.displayName = 'AddVideoToLocalPlaylistModal'

export default AddVideoToLocalPlaylistModal
