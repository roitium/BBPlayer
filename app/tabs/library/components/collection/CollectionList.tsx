import TabDisable from '@/app/tabs/library/components/shared/TabDisabled'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useInfiniteCollectionsList } from '@/hooks/queries/bilibili/favorite'
import { usePersonalInformation } from '@/hooks/queries/bilibili/user'
import useAppStore from '@/hooks/stores/useAppStore'
import type { BilibiliCollection } from '@/types/apis/bilibili'
import { FlashList } from '@shopify/flash-list'
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
	const enable = useAppStore(
		(state) =>
			!!state.bilibiliCookie && Object.keys(state.bilibiliCookie).length > 0,
	)

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

	if (!enable) {
		return <TabDisable />
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
		<View style={{ flex: 1, marginHorizontal: 16 }}>
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
			<FlashList
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
				estimatedItemSize={84}
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
