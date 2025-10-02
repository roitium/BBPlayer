import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import type { DownloadTaskMeta } from '@/types/core/downloadManagerStore'
import { useNavigation } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { useCallback } from 'react'
import { View } from 'react-native'
import { Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/shallow'
import DownloadTaskItem from './components/DownloadTaskItem'

export default function DownloadPage() {
	const { colors } = useTheme()
	const navigation = useNavigation()
	const tasks = useDownloadManagerStore(
		useShallow((state) => Object.values(state.downloadsMeta)),
	)
	const currentTrack = useCurrentTrack()
	const insets = useSafeAreaInsets()

	const renderItem = useCallback(({ item }: { item: DownloadTaskMeta }) => {
		return <DownloadTaskItem task={item} />
	}, [])
	const keyExtractor = useCallback(
		(item: DownloadTaskMeta) => item.uniqueKey,
		[],
	)

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content title='下载任务' />
			</Appbar.Header>
			<View style={{ flex: 1 }}>
				<FlashList
					data={tasks}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
					ListEmptyComponent={
						<View
							style={{
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Text>暂无下载</Text>
						</View>
					}
				/>
			</View>
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
