import AddToFavoriteListsModal from '@/components/modals/AddVideoToBilibiliFavModal'
import { useRecentlyPlayed } from '@/hooks/queries/bilibili/useUserData'
import type { Track } from '@/types/core/media'
import { LegendList } from '@legendapp/list'
import { useCallback, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import RecentlyPlayedItem from './RecentlyPlayedItem'

export default function RecentlyPlayed() {
	const { colors } = useTheme()
	const [refreshing, setRefreshing] = useState(false)
	const [modalVisible, setModalVisible] = useState(false)
	const [currentModalBvid, setCurrentModalBvid] = useState('')

	const {
		data: recentlyPlayed,
		isPending,
		isError,
		isRefetching,
		refetch,
	} = useRecentlyPlayed()

	const renderItem = useCallback(
		({ item }: { item: Track }) => (
			<RecentlyPlayedItem
				item={item}
				setModalVisible={setModalVisible}
				setCurrentModalBvid={setCurrentModalBvid}
			/>
		),
		[],
	)

	const keyExtractor = useCallback((item: Track) => item.id, [])

	const estimatedItemHeight = 72
	const flatListHeight = estimatedItemHeight * 3 + 30

	const limitedRecentlyPlayed = recentlyPlayed?.slice(0, 20)

	return (
		<>
			{/* Header */}
			<View
				style={{
					marginBottom: 8,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='titleLarge'
					style={{ fontWeight: 'bold' }}
				>
					最近播放
				</Text>
			</View>

			{/* Content Area */}
			{isPending ? (
				<ActivityIndicator style={{ marginTop: 10, marginBottom: 10 }} />
			) : isError ? (
				<Text style={{ textAlign: 'center', color: 'red' }}>
					加载最近播放失败
				</Text>
			) : !limitedRecentlyPlayed || limitedRecentlyPlayed.length === 0 ? (
				<Text style={{ textAlign: 'center', color: 'grey' }}>暂无播放记录</Text>
			) : (
				<View
					style={{
						height: flatListHeight,
						borderRadius: 8,
						borderColor: colors.surfaceVariant,
						borderWidth: 1,
					}}
				>
					<LegendList
						data={limitedRecentlyPlayed}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							paddingBottom: 8,
							paddingLeft: 4,
						}}
						refreshControl={
							<RefreshControl
								refreshing={isRefetching || refreshing}
								onRefresh={async () => {
									setRefreshing(true)
									await refetch()
									setRefreshing(false)
								}}
								colors={[colors.primary]}
								progressViewOffset={50}
							/>
						}
					/>
					<AddToFavoriteListsModal
						key={currentModalBvid}
						visible={modalVisible}
						bvid={currentModalBvid}
						setVisible={setModalVisible}
					/>
				</View>
			)}
		</>
	)
}
