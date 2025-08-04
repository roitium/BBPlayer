import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import PlayerQueueModal from '@/components/modals/PlayerQueueModal'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { IconButton, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../types/navigation'
import { FunctionalMenu } from './components/FunctionalMenu'
import { PlayerControls } from './components/PlayerControls'
import { PlayerHeader } from './components/PlayerHeader'
import { PlayerSlider } from './components/PlayerSlider'
import { TrackInfo } from './components/TrackInfo'

export default function PlayerPage() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width: screenWidth } = Dimensions.get('window')
	const sheetRef = useRef<BottomSheetMethods>(null)

	const currentTrack = useCurrentTrack()

	const [isFavorite, setIsFavorite] = useState(false)
	const [viewMode, _setViewMode] = useState<'cover' | 'lyrics'>('cover')
	const [menuVisible, setMenuVisible] = useState(false)
	const [favModalVisible, setFavModalVisible] = useState(false)

	if (!currentTrack) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
				<Text style={{ color: colors.onBackground }}>没有正在播放的曲目</Text>
				<IconButton
					icon='arrow-left'
					onPress={() => navigation.goBack()}
				/>
			</View>
		)
	}

	return (
		<View
			style={{
				flex: 1,
				height: '100%',
				width: '100%',
				backgroundColor: colors.background,
				paddingTop: insets.top,
			}}
		>
			<View style={{ flex: 1, justifyContent: 'space-between' }}>
				<View>
					<PlayerHeader onMorePress={() => setMenuVisible(true)} />
					<TrackInfo
						isFavorite={isFavorite}
						onFavoritePress={() => setIsFavorite(!isFavorite)}
					/>
				</View>

				<View
					style={{
						paddingHorizontal: 24,
						paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
					}}
				>
					<PlayerSlider />
					<PlayerControls
						onOpenQueue={() => sheetRef.current?.snapToPosition('75%')}
					/>
				</View>
			</View>

			<FunctionalMenu
				menuVisible={menuVisible}
				setMenuVisible={setMenuVisible}
				screenWidth={screenWidth}
				viewMode={viewMode}
				uploaderMid={Number(currentTrack.artist?.remoteId ?? undefined)}
				setFavModalVisible={setFavModalVisible}
			/>

			{currentTrack.source === 'bilibili' && (
				<AddToFavoriteListsModal
					key={currentTrack.id}
					visible={favModalVisible}
					setVisible={setFavModalVisible}
					bvid={currentTrack.bilibiliMetadata.bvid}
				/>
			)}

			<PlayerQueueModal sheetRef={sheetRef} />
		</View>
	)
}
