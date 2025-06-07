import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { Button, Checkbox, Dialog, Text, useTheme } from 'react-native-paper'
import {
	useDealFavoriteForOneVideo,
	useGetFavoriteForOneVideo,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { BilibiliPlaylist } from '@/types/apis/bilibili'
import log from '@/utils/log'

const modalLog = log.extend('ADD_TO_FAVORITE_LISTS_MODAL')

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
	const { data: personalInfo } = usePersonalInformation()
	const {
		data: playlists,
		refetch: refetchPlaylists,
		isPending: playlistsPending,
		isFetching: playlistsFetching,
		isError: playlistsError,
	} = useGetFavoriteForOneVideo(bvid, personalInfo?.mid)
	const { mutateAsync: dealFavoriteForOneVideo } = useDealFavoriteForOneVideo()
	const queryClient = useQueryClient()

	const [checkedList, setCheckedList] = useState<string[]>([])
	const keyExtractor = useCallback(
		(item: BilibiliPlaylist) => item.id.toString(),
		[],
	)
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

	useEffect(() => {
		if (visible && playlists) {
			const currentlyFavoritedIds = playlists
				.filter((item) => item.fav_state === 1)
				.map((item) => item.id.toString())
			setCheckedList(currentlyFavoritedIds)
		}
	}, [playlists, visible])

	const handleConfirm = useCallback(async () => {
		if (!playlists) return

		const initialCheckedIds = playlists
			.filter((item) => item.fav_state === 1)
			.map((item) => item.id.toString())

		const currentCheckedIds = new Set(checkedList)
		const initialCheckedIdsSet = new Set(initialCheckedIds)

		const addToFavoriteIds: string[] = []
		const delInFavoriteIds: string[] = []

		for (const id of currentCheckedIds) {
			if (!initialCheckedIdsSet.has(id)) {
				addToFavoriteIds.push(id)
			}
		}

		for (const id of initialCheckedIdsSet) {
			if (!currentCheckedIds.has(id)) {
				delInFavoriteIds.push(id.toString())
			}
		}

		modalLog.debug('Processing favorite changes', {
			bvid,
			addToFavoriteIds,
			delInFavoriteIds,
		})

		if (addToFavoriteIds.length === 0 && delInFavoriteIds.length === 0) {
			modalLog.debug('No changes detected, closing modal.')
			setVisible(false)
			return
		}

		try {
			await dealFavoriteForOneVideo({
				bvid,
				addToFavoriteIds: addToFavoriteIds,
				delInFavoriteIds: delInFavoriteIds,
			})
		} finally {
			// 保证每一次打开时都能加载到最新的状态
			setVisible(false)
			queryClient.removeQueries({
				queryKey: ['bilibili', 'favoriteList', 'favoriteForOneVideo'],
			})
		}
	}, [
		bvid,
		playlists,
		checkedList,
		dealFavoriteForOneVideo,
		setVisible,
		queryClient.removeQueries,
	])

	const showLoading =
		playlistsPending || (visible && playlistsFetching && !playlists)
	const showError = playlistsError && visible

	if (showLoading) {
		return (
			<Dialog
				visible={visible}
				onDismiss={() => setVisible(false)}
			>
				<Dialog.Title>添加到收藏夹</Dialog.Title>
				<Dialog.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
					<ActivityIndicator size={'large'} />
				</Dialog.Content>
			</Dialog>
		)
	}

	if (showError) {
		return (
			<Dialog
				visible={visible}
				onDismiss={() => setVisible(false)}
			>
				<Dialog.Title>添加到收藏夹</Dialog.Title>
				<Dialog.Content>
					<Text
						style={{ textAlign: 'center', color: colors.error, padding: 16 }}
					>
						加载收藏夹失败
					</Text>
				</Dialog.Content>
				<Dialog.Actions>
					<Button onPress={() => setVisible(false)}>关闭</Button>
					<Button onPress={() => refetchPlaylists()}>重试</Button>
				</Dialog.Actions>
			</Dialog>
		)
	}

	return (
		<Dialog
			visible={visible}
			onDismiss={() => setVisible(false)}
		>
			<Dialog.Title>添加到收藏夹</Dialog.Title>
			<Dialog.Content>
				<FlatList
					data={playlists || []}
					renderItem={renderFavoriteListItem}
					keyExtractor={keyExtractor}
					style={{
						height: 300,
						borderColor: colors.elevation.level5,
						borderWidth: 1,
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
			</Dialog.Content>
			<Dialog.Actions style={{ marginTop: 16 }}>
				<Button onPress={() => setVisible(false)}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</Dialog>
	)
})

AddToFavoriteListsModal.displayName = 'FavoriteListItem'

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
	const handlePress = () => {
		setCheckedList(
			checkedList.includes(id.toString())
				? checkedList.filter((item) => item !== id.toString())
				: [...checkedList, id.toString()],
		)
	}
	return (
		<Checkbox.Item
			status={checkedList.includes(id.toString()) ? 'checked' : 'unchecked'}
			onPress={handlePress}
			label={name}
		/>
	)
})

FavoriteListItem.displayName = 'FavoriteListItem'

export default AddToFavoriteListsModal
