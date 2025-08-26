import PlayerQueueModal from '@/components/modals/PlayerQueueModal'
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
import Lyrics from './components/PlayerLyrics'
import { PlayerSlider } from './components/PlayerSlider'
import { TrackInfo } from './components/PlayerTrackInfo'

export default function PlayerPage() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width: screenWidth } = Dimensions.get('window')
	const sheetRef = useRef<BottomSheetMethods>(null)

	const currentTrack = useCurrentTrack()

	const [isFavorite, setIsFavorite] = useState(false)
	const [viewMode, setViewMode] = useState<'cover' | 'lyrics'>('cover')
	const [menuVisible, setMenuVisible] = useState(false)

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
				<View
					style={{
						flex: 1,
						marginBottom: 16,
						pointerEvents: menuVisible ? 'none' : 'auto',
					}}
				>
					<PlayerHeader onMorePress={() => setMenuVisible(true)} />
					{viewMode === 'cover' ? (
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
							onPressCover={() => setViewMode('lyrics')}
						/>
					) : (
						<Lyrics
							onBackPress={() => setViewMode('cover')}
							track={currentTrack}
						/>
					)}
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
				uploaderMid={Number(currentTrack.artist?.remoteId ?? undefined)}
			/>

			<PlayerQueueModal sheetRef={sheetRef} />
		</View>
	)
}
