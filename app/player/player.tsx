import AddToFavoriteListsModal from '@/components/modals/AddVideoToBilibiliFavModal'
import PlayerQueueModal from '@/components/modals/PlayerQueueModal'
import AddVideoToLocalPlaylistModal from '@/components/modals/UpdateTrackLocalPlaylistsModal'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { IconButton, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../../types/navigation'
import { PlayerControls } from './components/PlayerControls'
import { PlayerFunctionalMenu } from './components/PlayerFunctionalMenu'
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
	const [localPlaylistModalVisible, setLocalPlaylistModalVisible] =
		useState(false)

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
						onArtistPress={() =>
							currentTrack.artist?.remoteId
								? navigation.navigate('PlaylistUploader', {
										mid: currentTrack.artist?.remoteId,
									})
								: void 0
						}
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

			<PlayerFunctionalMenu
				menuVisible={menuVisible}
				setMenuVisible={setMenuVisible}
				screenWidth={screenWidth}
				viewMode={viewMode}
				uploaderMid={Number(currentTrack.artist?.remoteId ?? undefined)}
				setFavModalVisible={setFavModalVisible}
				setLocalPlaylistModalVisible={setLocalPlaylistModalVisible}
			/>

			{currentTrack.source === 'bilibili' && (
				<AddToFavoriteListsModal
					key={currentTrack.id}
					visible={favModalVisible}
					setVisible={setFavModalVisible}
					bvid={currentTrack.bilibiliMetadata.bvid}
				/>
			)}
			<AddVideoToLocalPlaylistModal
				track={currentTrack}
				visible={localPlaylistModalVisible}
				setVisible={setLocalPlaylistModalVisible}
			/>

			<PlayerQueueModal sheetRef={sheetRef} />
		</View>
	)
}
