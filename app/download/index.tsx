import NowPlayingBar from '@/components/NowPlayingBar'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import type { DownloadTask } from '@/types/core/downloadManagerStore'
import { useNavigation } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { useCallback } from 'react'
import { View } from 'react-native'
import { Appbar, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/shallow'
import DownloadHeader from './components/DownloadHeader'
import DownloadTaskItem from './components/DownloadTaskItem'

export default function DownloadPage() {
	const { colors } = useTheme()
	const navigation = useNavigation()
	const insets = useSafeAreaInsets()

	const tasks = useDownloadManagerStore(
		useShallow((state) => Object.values(state.downloads)),
	)
	const start = useDownloadManagerStore((state) => state.startDownload)
	const clearAll = useDownloadManagerStore((state) => state.clearAll)

	const currentTrack = useCurrentTrack()

	const renderItem = useCallback(({ item }: { item: DownloadTask }) => {
		return <DownloadTaskItem task={item} />
	}, [])

	const keyExtractor = useCallback((item: DownloadTask) => item.uniqueKey, [])

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Appbar.Header elevated>
				<Appbar.BackAction onPress={() => navigation.goBack()} />
				<Appbar.Content title='下载任务' />
			</Appbar.Header>

			<DownloadHeader
				taskCount={tasks.length}
				onStartAll={start}
				onClearAll={clearAll}
			/>

			<View style={{ flex: 1 }}>
				<FlashList
					data={tasks}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					contentContainerStyle={{
						paddingBottom: currentTrack ? 70 + insets.bottom : insets.bottom,
					}}
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
