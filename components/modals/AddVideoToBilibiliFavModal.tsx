import { useDealFavoriteForOneVideo } from '@/hooks/mutations/bilibili/favorite'
import {
	favoriteListQueryKeys,
	useGetFavoriteForOneVideo,
} from '@/hooks/queries/bilibili/favorite'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import type { BilibiliPlaylist } from '@/types/apis/bilibili'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, View } from 'react-native'
import {
	Button,
	Checkbox,
	Dialog,
	Divider,
	Text,
	useTheme,
} from 'react-native-paper'
import { AnimatedModal } from '../AnimatedModal'

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
	visible,
	setVisible,
	bvid,
}: {
	visible: boolean
	setVisible: (visible: boolean) => void
	bvid: string
}) {
	const { colors } = useTheme()
	const queryClient = useQueryClient()
	const { data: personalInfo } = usePersonalInformation()

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
			setVisible(false)
			return
		}

		try {
			dealFavorite({
				bvid,
				addToFavoriteIds,
				delInFavoriteIds,
			})
		} finally {
			setVisible(false)
			queryClient.removeQueries({
				queryKey: favoriteListQueryKeys.favoriteForOneVideo(
					bvid,
					personalInfo?.mid,
				),
			})
		}
	}, [
		bvid,
		playlists,
		checkedList,
		dealFavorite,
		isMutating,
		setVisible,
		queryClient,
		personalInfo?.mid,
	])

	const handleDismiss = () => setVisible(false)

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
							onPress={handleDismiss}
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
				<Dialog.Content>
					<Divider bold />
					{/* 这里用 LegendList 会有 bug，添加了 extraData={checkedList} 会导致卡顿，不添加又会导致数据不同步 */}
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
					<Divider bold />
				</Dialog.Content>
				<Dialog.Actions style={{ marginTop: 16 }}>
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
						确定
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
			<Dialog.Title>添加到收藏夹</Dialog.Title>
			{renderContent()}
		</AnimatedModal>
	)
})

AddToFavoriteListsModal.displayName = 'AddToFavoriteListsModal'

export default AddToFavoriteListsModal
