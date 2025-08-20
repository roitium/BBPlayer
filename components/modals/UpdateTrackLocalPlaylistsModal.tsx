import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
	Button,
	Checkbox,
	Dialog,
	Divider,
	Text,
	useTheme,
} from 'react-native-paper'

import { useUpdateTrackLocalPlaylists } from '@/hooks/mutations/db/playlist'
import {
	usePlaylistLists,
	usePlaylistsContainingTrack,
} from '@/hooks/queries/db/playlist'
import generateUniqueTrackKey from '@/lib/services/genKey'
import type { Playlist, Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { FlashList } from '@shopify/flash-list'
import { AnimatedModal } from '../commonUIs/AnimatedModal'
import CreatePlaylistModal from './CreatePlaylistModal'

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
		const [createPlaylistModalVisible, setCreatePlaylistModalVisible] =
			useState(false)

		const {
			data: allPlaylists,
			isPending: isPlaylistsPending,
			isError: isPlaylistsError,
			refetch: refetchPlaylists,
		} = usePlaylistLists()
		const sortedAllPlaylists = useMemo(
			() =>
				allPlaylists?.sort(
					(a, b) => Number(a.type !== 'local') - Number(b.type !== 'local'),
				),
			[allPlaylists],
		)

		const uniqueKey = generateUniqueTrackKey(track).unwrapOr(undefined)
		if (!uniqueKey) toast.error('无法生成 uniqueKey')
		const {
			data: playlistsContainingTrack,
			isPending: isContainingTrackPending,
			isError: isContainingTrackError,
			refetch: refetchContainingTrack,
		} = usePlaylistsContainingTrack(uniqueKey)

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

		const handleConfirm = useCallback(() => {
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

			updateTracks({
				toAddPlaylistIds,
				toRemovePlaylistIds,
				trackPayload: track,
				artistPayload: track.artist,
			})

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
				const isDisabled = item.type !== 'local'

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
			[checkedPlaylistIds, handleCheckboxPress],
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
					<Dialog.Content style={{ minHeight: 400 }}>
						<Divider bold />
						<View style={{ flex: 1, minHeight: 300 }}>
							<FlashList
								data={sortedAllPlaylists ?? []}
								renderItem={renderPlaylistItem}
								keyExtractor={keyExtractor}
								extraData={checkedPlaylistIds}
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
						</View>
						<Divider bold />
						<Text
							variant='bodySmall'
							style={{ padding: 16 }}
						>
							* 与远程同步的播放列表无法选择
						</Text>
					</Dialog.Content>
					<Dialog.Actions style={{ justifyContent: 'space-between' }}>
						<Button onPress={() => setCreatePlaylistModalVisible(true)}>
							创建歌单
						</Button>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
						</View>
					</Dialog.Actions>
				</>
			)
		}

		return (
			<>
				<AnimatedModal
					visible={visible}
					onDismiss={handleDismiss}
				>
					<Dialog.Title>添加到歌单</Dialog.Title>
					{renderContent()}
				</AnimatedModal>
				<CreatePlaylistModal
					visiable={createPlaylistModalVisible}
					setVisible={setCreatePlaylistModalVisible}
				/>
			</>
		)
	},
)

AddVideoToLocalPlaylistModal.displayName = 'AddVideoToLocalPlaylistModal'

export default AddVideoToLocalPlaylistModal
