import { memo, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Button, Dialog, RadioButton, Text, useTheme } from 'react-native-paper'

import { useBatchAddTracksToLocalPlaylist } from '@/hooks/mutations/db/playlist'
import { usePlaylistLists } from '@/hooks/queries/db/playlist'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { Playlist } from '@/types/core/media'
import type { CreateArtistPayload } from '@/types/services/artist'
import type { CreateTrackPayload } from '@/types/services/track'
import { FlashList } from '@shopify/flash-list'

const BatchAddTracksToLocalPlaylistModal = memo(
	function AddTracksToLocalPlaylistModal({
		payloads,
	}: {
		payloads: { track: CreateTrackPayload; artist: CreateArtistPayload }[]
	}) {
		const { colors } = useTheme()
		const _close = useModalStore((state) => state.close)
		const close = useCallback(
			() => _close('BatchAddTracksToLocalPlaylist'),
			[_close],
		)
		const openModal = useModalStore((state) => state.open)

		const {
			data: allPlaylists,
			isPending: isPlaylistsPending,
			isError: isPlaylistsError,
			refetch: refetchPlaylists,
		} = usePlaylistLists()
		const filteredPlaylists = useMemo(
			() => allPlaylists?.filter((p) => p.type === 'local'),
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
			close()
		}, [close, isMutating])

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
					onSettled: () => close(),
				},
			)
		}, [batchAdd, close, isMutating, payloads, selectedPlaylistId])

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
					<Dialog.ScrollArea style={{ minHeight: 300 }}>
						<FlashList
							data={filteredPlaylists ?? []}
							renderItem={renderPlaylistItem}
							keyExtractor={keyExtractor}
							extraData={selectedPlaylistId}
							showsVerticalScrollIndicator={false}
							ListEmptyComponent={
								<View
									style={{
										flex: 1,
										justifyContent: 'center',
										alignItems: 'center',
									}}
								>
									<Text>你还没有创建任何歌单</Text>
								</View>
							}
						/>
					</Dialog.ScrollArea>
					<Dialog.Content>
						<Text variant='bodySmall'>* 与远程同步的播放列表不会显示</Text>
					</Dialog.Content>
					<Dialog.Actions style={{ justifyContent: 'space-between' }}>
						<Button
							onPress={() =>
								openModal('CreatePlaylist', { redirectToNewPlaylist: false })
							}
						>
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
				<Dialog.Title>添加到歌单</Dialog.Title>
				{renderContent()}
			</>
		)
	},
)

BatchAddTracksToLocalPlaylistModal.displayName = 'AddTracksToLocalPlaylistModal'

export default BatchAddTracksToLocalPlaylistModal
