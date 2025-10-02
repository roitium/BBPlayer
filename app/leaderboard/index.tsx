import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { trackService } from '@/lib/services/trackService'
import type { Track } from '@/types/core/media'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import {
	ActivityIndicator,
	Appbar,
	Surface,
	Text,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LeaderboardListItem } from './components/LeaderboardItem'

interface LeaderboardItemData {
	track: Track
	playCount: number
}

const formatDurationToWords = (seconds: number) => {
	if (isNaN(seconds) || seconds < 0) {
		return '0秒'
	}
	const h = Math.floor(seconds / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = Math.floor(seconds % 60)

	const parts = []
	if (h > 0) parts.push(`${h}时`)
	if (m > 0) parts.push(`${m}分`)
	if (s > 0 || parts.length === 0) parts.push(`${s}秒`)

	return parts.join(' ')
}

export default function LeaderboardPage() {
	const { colors } = useTheme()
	const navigation = useNavigation()
	const [data, setData] = useState<LeaderboardItemData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isError, setIsError] = useState(false)
	const [totalDurationNumber, setTotalDurationNumber] = useState(0)
	const insets = useSafeAreaInsets()
	const currentTrack = useCurrentTrack()

	useFocusEffect(() => {
		const fetchLeaderboard = async () => {
			setIsLoading(true)
			setIsError(false)
			const result = await trackService.getPlayCountLeaderboard(50, {
				onlyCompleted: true,
			})
			if (result.isOk()) {
				setData(result.value)
			} else {
				setIsError(true)
			}
			const totalDurationResult = await trackService.getTotalPlaybackDuration({
				onlyCompleted: true,
			})
			if (totalDurationResult.isOk()) {
				setTotalDurationNumber(totalDurationResult.value)
			} else {
				setIsError(true)
			}
			setIsLoading(false)
		}

		void fetchLeaderboard()
	})

	const totalDuration = useMemo(() => {
		if (!data) return '0秒'
		return formatDurationToWords(totalDurationNumber)
	}, [data, totalDurationNumber])

	const renderItem = useCallback(
		({ item, index }: { item: LeaderboardItemData; index: number }) => (
			<LeaderboardListItem
				item={item}
				index={index}
			/>
		),
		[],
	)

	const keyExtractor = useCallback(
		(item: LeaderboardItemData) => item.track.uniqueKey,
		[],
	)

	const renderContent = () => {
		if (isLoading) {
			return (
				<ActivityIndicator
					animating={true}
					style={{ marginTop: 20 }}
				/>
			)
		}

		if (isError) {
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<Text>加载失败</Text>
				</View>
			)
		}

		if (data.length === 0) {
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<Text>暂无数据</Text>
				</View>
			)
		}

		return (
			<FlashList
				data={data}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentContainerStyle={{
					paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
				}}
				ListFooterComponent={
					data.length === 50 ? (
						<Text
							variant='bodyMedium'
							style={{
								textAlign: 'center',
								padding: 16,
							}}
						>
							以下省略...
						</Text>
					) : null
				}
			/>
		)
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content title='统计' />
			</Appbar.Header>
			{data.length > 0 && (
				<Surface
					style={{
						marginHorizontal: 16,
						marginTop: 16,
						marginBottom: 8,
						padding: 16,
						borderRadius: 12,
						alignItems: 'center',
					}}
					elevation={2}
				>
					<Text variant='titleMedium'>总计听歌时长</Text>
					<Text
						variant='headlineMedium'
						style={{ marginTop: 8, color: colors.primary }}
					>
						{totalDuration}
					</Text>
					<Text
						variant='bodySmall'
						style={{ marginTop: 4, color: colors.onSurfaceVariant }}
					>
						（仅统计完整播放的歌曲）
					</Text>
				</Surface>
			)}
			<View style={{ flex: 1 }}>{renderContent()}</View>
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
