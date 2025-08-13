import { memo, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
	Button,
	Dialog,
	Divider,
	RadioButton,
	Text,
	useTheme,
} from 'react-native-paper'

import { useBatchAddTracksToLocalPlaylist } from '@/hooks/mutations/db/playlist'
import { usePlaylistLists } from '@/hooks/queries/db/playlist'
import type { Playlist } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { FlashList } from '@shopify/flash-list'
import { AnimatedModal } from '../AnimatedModal'
import CreatePlaylistModal from './CreatePlaylistModal'

const BatchAddTracksToLocalPlaylistModal = memo(
	function AddTracksToLocalPlaylistModal({
		payloads,
		visible,
		setVisible,
	}: {
		payloads: { track: CreateTrackPayload; artist: CreateArtistPayload }[]
		visible: boolean
		setVisible: (visible: boolean) => void
	}) {
		const { colors } = useTheme()
		const [CreatePlaylistModalVisible, setCreatePlaylistModalVisible] =
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

		const { mutate: batchAdd, isPending: isMutating } =
			useBatchAddTracksToLocalPlaylist()

		const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
			null,
		)

		const isLoading = isPlaylistsPending
		const isError = isPlaylistsError

		const handleDismiss = useCallback(() => {
			if (isMutating) return
			setVisible(false)
		}, [isMutating, setVisible])

		const handleRetry = useCallback(() => {
			if (isPlaylistsError) void refetchPlaylists()
		}, [isPlaylistsError, refetchPlaylists])

		const handleConfirm = useCallback(() => {
			if (isMutating || selectedPlaylistId == null) return

			batchAdd(
				{
					playlistId: selectedPlaylistId,
					payloads,
				},
				{
					onSettled: () => setVisible(false),
				},
			)
		}, [batchAdd, isMutating, payloads, selectedPlaylistId, setVisible])

		const renderPlaylistItem = useCallback(
			({ item }: { item: Playlist }) => {
				const isChecked = selectedPlaylistId === item.id
				const isDisabled = item.type !== 'local'

				return (
					<RadioButton.Item
						label={item.title}
						value={String(item.id)}
						status={isChecked ? 'checked' : 'unchecked'}
						onPress={() => !isDisabled && setSelectedPlaylistId(item.id)}
						disabled={isDisabled}
					/>
				)
			},
			[selectedPlaylistId],
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
								estimatedItemSize={56}
								keyExtractor={keyExtractor}
								extraData={selectedPlaylistId}
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
								disabled={isMutating || selectedPlaylistId == null}
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
					visiable={CreatePlaylistModalVisible}
					setVisible={setCreatePlaylistModalVisible}
				/>
			</>
		)
	},
)

BatchAddTracksToLocalPlaylistModal.displayName = 'AddTracksToLocalPlaylistModal'

export default BatchAddTracksToLocalPlaylistModal
