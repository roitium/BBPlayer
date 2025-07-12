import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useInfiniteCollectionsList } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { BilibiliCollection } from '@/types/apis/bilibili'
import { LegendList } from '@legendapp/list'
import { memo, useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import { DataFetchingError } from '../shared/DataFetchingError'
import { DataFetchingPending } from '../shared/DataFetchingPending'
import CollectionListItem from './CollectionListItem'

const CollectionListComponent = memo(() => {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const [refreshing, setRefreshing] = useState(false)

	const { data: userInfo } = usePersonalInformation()
	const {
		data: collections,
		isPending: collectionsIsPending,
		isError: collectionsIsError,
		isRefetching: collectionsIsRefetching,
		refetch,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteCollectionsList(Number(userInfo?.mid))

	const renderCollectionItem = useCallback(
		({ item }: { item: BilibiliCollection }) => (
			<CollectionListItem item={item} />
		),
		[],
	)
	const keyExtractor = useCallback(
		(item: BilibiliCollection) => item.id.toString(),
		[],
	)

	const onRefresh = async () => {
		setRefreshing(true)
		await refetch()
		setRefreshing(false)
	}

	if (collectionsIsPending) {
		return <DataFetchingPending />
	}

	if (collectionsIsError) {
		return (
			<DataFetchingError
				text='加载失败'
				onRetry={() => onRefresh()}
			/>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<View
				style={{
					marginBottom: 8,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='titleMedium'
					style={{ fontWeight: 'bold' }}
				>
					我的合集/收藏夹追更
				</Text>
				<Text variant='bodyMedium'>
					{collections.pages[0]?.count ?? 0} 个追更
				</Text>
			</View>
			<LegendList
				data={collections.pages.flatMap((page) => page.list)}
				renderItem={renderCollectionItem}
				refreshControl={
					<RefreshControl
						refreshing={refreshing || collectionsIsRefetching}
						onRefresh={onRefresh}
						colors={[colors.primary]}
						progressViewOffset={50}
					/>
				}
				keyExtractor={keyExtractor}
				contentContainerStyle={{ paddingBottom: currentTrack ? 70 : 10 }}
				showsVerticalScrollIndicator={false}
				onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
				ListFooterComponent={
					hasNextPage ? (
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'center',
								padding: 16,
							}}
						>
							<ActivityIndicator size='small' />
						</View>
					) : (
						<Text
							variant='titleMedium'
							style={{ textAlign: 'center', paddingTop: 10 }}
						>
							•
						</Text>
					)
				}
			/>
		</View>
	)
})

CollectionListComponent.displayName = 'CollectionListComponent'

export default CollectionListComponent
