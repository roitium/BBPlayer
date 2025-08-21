import { AnimatedModal } from '@/components/commonUIs/AnimatedModal'
import { trackService } from '@/lib/services/trackService'
import type { Track } from '@/types/core/media'
import toast from '@/utils/toast'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Button, Dialog, Divider, Text, useTheme } from 'react-native-paper'

interface LeaderboardItem {
	track: Track
	playCount: number
}

function RankItem({ item, index }: { item: LeaderboardItem; index: number }) {
	const colors = useTheme().colors
	const medal = useMemo(() => {
		if (index === 0) return '🥇'
		if (index === 1) return '🥈'
		if (index === 2) return '🥉'
		return `${index + 1}.`
	}, [index])

	return (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				paddingVertical: 8,
				gap: 8,
			}}
		>
			<View style={{ width: 36, alignItems: 'center' }}>
				<Text variant='titleSmall'>{medal}</Text>
			</View>
			<View style={{ flex: 1 }}>
				<Text
					variant='bodyMedium'
					style={{ fontWeight: '600' }}
				>
					{item.track.title}
				</Text>
				<Text
					variant='bodySmall'
					numberOfLines={1}
				>
					{item.track.artist?.name ?? '未知作者'}
				</Text>
			</View>
			<View style={{ minWidth: 60, alignItems: 'flex-end' }}>
				<Text
					variant='titleSmall'
					style={{ color: colors.onSecondaryContainer }}
				>
					x{item.playCount}
				</Text>
			</View>
		</View>
	)
}

const PlayCountLeaderboardModal = memo(function PlayCountLeaderboardModal({
	visible,
	setVisible,
}: {
	visible: boolean
	setVisible: (v: boolean) => void
}) {
	const [data, setData] = useState<LeaderboardItem[] | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const mockData = useMemo(() => {
		if (!data) return []
		const newData = []
		for (const item of data) {
			newData.push({
				track: {
					...item.track,
					uniqueKey: `${item.track.uniqueKey}-mock-1`,
				},
				playCount: item.playCount + 1,
			})
		}
		return [...newData, ...data]
	}, [data])

	const fetchData = async () => {
		setLoading(true)
		setError(null)
		const res = await trackService.getPlayCountLeaderboard(20, {
			onlyCompleted: true,
		})
		if (res.isErr()) {
			setError('加载排行榜失败')
			toast.error('加载排行榜失败')
			setLoading(false)
			return
		}
		setData(res.value)
		setLoading(false)
	}

	useEffect(() => {
		if (visible) void fetchData()
	}, [visible])

	const handleDismiss = () => setVisible(false)

	const keyExtractor = useCallback(
		(item: LeaderboardItem) => `${item.track.uniqueKey}`,
		[],
	)

	const renderItem = useCallback(
		({ item, index }: { item: LeaderboardItem; index: number }) => (
			<RankItem
				item={item}
				index={index}
			/>
		),
		[],
	)

	const ListEmpty = useCallback(
		() => (
			<View
				style={{
					flex: 1,
					paddingVertical: 24,
					alignItems: 'center',
				}}
			>
				<Text>暂无播放记录</Text>
			</View>
		),
		[],
	)

	const ItemSeparator = useCallback(() => <Divider />, [])

	return (
		<AnimatedModal
			visible={visible}
			onDismiss={handleDismiss}
		>
			<Dialog.Title>播放排行榜</Dialog.Title>
			<Dialog.Content style={{ minHeight: 400 }}>
				<Text
					variant='bodySmall'
					style={{ marginBottom: 8, opacity: 0.7 }}
				>
					说明：仅统计完整播放的次数
				</Text>
				<Divider bold />
				{loading ? (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<Text>正在加载...</Text>
					</View>
				) : error ? (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<Text>{error}</Text>
					</View>
				) : (
					<View style={{ flex: 1, minHeight: 300 }}>
						<FlashList
							data={mockData ?? []}
							style={{ height: 300 }}
							keyExtractor={keyExtractor}
							renderItem={renderItem}
							ListEmptyComponent={ListEmpty}
							ItemSeparatorComponent={ItemSeparator}
							onTouchStart={(e) => console.log(e.nativeEvent)}
						/>
					</View>
				)}
			</Dialog.Content>
			<Dialog.Actions>
				<Button onPress={handleDismiss}>关闭</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
})

PlayCountLeaderboardModal.displayName = 'PlayCountLeaderboardModal'

export default PlayCountLeaderboardModal
