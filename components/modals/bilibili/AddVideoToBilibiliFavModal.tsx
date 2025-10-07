import { useDealFavoriteForOneVideo } from '@/hooks/mutations/bilibili/favorite'
import {
	favoriteListQueryKeys,
	useGetFavoriteForOneVideo,
} from '@/hooks/queries/bilibili/favorite'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import useAppStore from '@/hooks/stores/useAppStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { BilibiliPlaylist } from '@/types/apis/bilibili'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { Button, Checkbox, Dialog, Text, useTheme } from 'react-native-paper'

const FavoriteListItem = memo(function FavoriteListItem({
	name,
	id,
	checkedList,
	setCheckedList,
}: {
	name: string
	id: number
	checkedList: string[]
	setCheckedList: (checkedList: string[]) => void
}) {
	const handlePress = useCallback(() => {
		setCheckedList(
			checkedList.includes(id.toString())
				? checkedList.filter((item) => item !== id.toString())
				: [...checkedList, id.toString()],
		)
	}, [checkedList, id, setCheckedList])

	return (
		<Checkbox.Item
			status={checkedList.includes(id.toString()) ? 'checked' : 'unchecked'}
			onPress={handlePress}
			label={name}
		/>
	)
})
FavoriteListItem.displayName = 'FavoriteListItem'

const AddToFavoriteListsModal = memo(function AddToFavoriteListsModal({
	bvid,
}: {
	bvid: string
}) {
	const { colors } = useTheme()
	const queryClient = useQueryClient()
	const { data: personalInfo } = usePersonalInformation()
	const enable = useAppStore((state) => state.hasBilibiliCookie())
	const _close = useModalStore((state) => state.close)
	const close = useCallback(
		() => _close('AddVideoToBilibiliFavorite'),
		[_close],
	)
	const open = useModalStore((state) => state.open)

	const {
		data: playlists,
		refetch,
		isPending,
		isError,
	} = useGetFavoriteForOneVideo(bvid, personalInfo?.mid)

	const { mutate: dealFavorite, isPending: isMutating } =
		useDealFavoriteForOneVideo()

	const [checkedList, setCheckedList] = useState<string[]>([])

	useEffect(() => {
		if (playlists) {
			const initialCheckedIds = playlists
				.filter((item) => item.fav_state === 1)
				.map((item) => item.id.toString())

			// eslint-disable-next-line react-you-might-not-need-an-effect/no-derived-state -- 暂时没想到更好的解决办法
			setCheckedList(initialCheckedIds)
		}
	}, [playlists])

	const handleConfirm = useCallback(() => {
		if (!playlists || isMutating) return

		const initialCheckedIds = new Set(
			playlists
				.filter((item) => item.fav_state === 1)
				.map((item) => item.id.toString()),
		)

		const currentCheckedIds = new Set(checkedList)

		const addToFavoriteIds: string[] = []
		const delInFavoriteIds: string[] = []

		for (const id of currentCheckedIds) {
			if (!initialCheckedIds.has(id)) {
				addToFavoriteIds.push(id)
			}
		}

		for (const id of initialCheckedIds) {
			if (!currentCheckedIds.has(id)) {
				delInFavoriteIds.push(id)
			}
		}

		if (addToFavoriteIds.length === 0 && delInFavoriteIds.length === 0) {
			close()
			return
		}

		try {
			dealFavorite({
				bvid,
				addToFavoriteIds,
				delInFavoriteIds,
			})
		} catch {
			// empty
		}

		close()
		queryClient.removeQueries({
			queryKey: favoriteListQueryKeys.favoriteForOneVideo(
				bvid,
				personalInfo?.mid,
			),
		})
	}, [
		playlists,
		isMutating,
		checkedList,
		close,
		dealFavorite,
		bvid,
		queryClient,
		personalInfo?.mid,
	])

	const renderFavoriteListItem = useCallback(
		({ item }: { item: BilibiliPlaylist }) => (
			<FavoriteListItem
				name={item.title}
				id={item.id}
				checkedList={checkedList}
				setCheckedList={setCheckedList}
			/>
		),
		[checkedList],
	)

	const keyExtractor = useCallback(
		(item: BilibiliPlaylist) => item.id.toString(),
		[],
	)

	const renderContent = () => {
		if (!enable) {
			return (
				<View
					style={{
						paddingTop: 16,
						alignItems: 'center',
						justifyContent: 'center',
						gap: 16,
					}}
				>
					<Text
						variant='titleMedium'
						style={{ textAlign: 'center' }}
					>
						登录 bilibili 账号后才能查看收藏夹
					</Text>
					<Button
						mode='contained'
						onPress={() => {
							close()
							open('QRCodeLogin', undefined)
						}}
					>
						登录
					</Button>
				</View>
			)
		}
		if (isPending) {
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
						<Text
							style={{ textAlign: 'center', color: colors.error, padding: 16 }}
						>
							加载收藏夹失败
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button
							onPress={close}
							disabled={isMutating}
						>
							关闭
						</Button>
						<Button onPress={() => refetch()}>重试</Button>
					</Dialog.Actions>
				</>
			)
		}

		return (
			<>
				<Dialog.ScrollArea>
					<FlatList
						data={playlists || []}
						extraData={checkedList} // 必须添加
						renderItem={renderFavoriteListItem}
						keyExtractor={keyExtractor}
						style={{
							height: 300,
						}}
						ListEmptyComponent={
							<View
								style={{
									flex: 1,
									justifyContent: 'center',
									alignItems: 'center',
								}}
							>
								<Text style={{ padding: 16 }}>暂无收藏夹</Text>
							</View>
						}
					/>
				</Dialog.ScrollArea>
				<Dialog.Actions style={{ marginTop: 16 }}>
					<Button
						onPress={close}
						disabled={isMutating}
					>
						取消
					</Button>
					<Button
						onPress={handleConfirm}
						loading={isMutating}
						disabled={isMutating}
					>
						确定
					</Button>
				</Dialog.Actions>
			</>
		)
	}

	return (
		<>
			<Dialog.Title>添加到收藏夹</Dialog.Title>
			{renderContent()}
		</>
	)
})

AddToFavoriteListsModal.displayName = 'AddToFavoriteListsModal'

export default AddToFavoriteListsModal
