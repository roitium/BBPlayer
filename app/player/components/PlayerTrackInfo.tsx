import { useThumbUpVideo } from '@/hooks/mutations/bilibili/video'
import { useGetVideoIsThumbUp } from '@/hooks/queries/bilibili/video'
import useCurrentTrack from '@/hooks/stores/playerHooks/useCurrentTrack'
import { Image } from 'expo-image'
import { Dimensions, TouchableOpacity, View } from 'react-native'
import { IconButton, Text, TouchableRipple, useTheme } from 'react-native-paper'

export function TrackInfo({
	onArtistPress,
	onPressCover,
}: {
	onArtistPress: () => void
	onPressCover: () => void
}) {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const { width: screenWidth } = Dimensions.get('window')
	const isBilibiliVideo = currentTrack?.source === 'bilibili'

	const { data: isThumbUp, isPending: isThumbUpPending } = useGetVideoIsThumbUp(
		isBilibiliVideo ? currentTrack?.bilibiliMetadata.bvid : undefined,
	)
	const { mutate: doThumbUpAction } = useThumbUpVideo()

	const onThumbUpPress = () => {
		if (isThumbUpPending || !isBilibiliVideo) return
		doThumbUpAction({
			bvid: currentTrack.bilibiliMetadata.bvid,
			like: !isThumbUp,
		})
	}

	if (!currentTrack) return null

	return (
		<View>
			<View
				style={{
					alignItems: 'center',
					paddingHorizontal: 32,
					paddingVertical: 24,
				}}
			>
				<TouchableOpacity
					activeOpacity={0.8}
					onPress={onPressCover}
				>
					<Image
						source={{ uri: currentTrack.coverUrl ?? undefined }}
						style={{
							width: screenWidth - 80,
							height: screenWidth - 80,
							borderRadius: 16,
						}}
						recyclingKey={currentTrack.uniqueKey}
					/>
				</TouchableOpacity>
			</View>

			<View style={{ paddingHorizontal: 24 }}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<View style={{ flex: 1, marginRight: 8 }}>
						<Text
							variant='titleLarge'
							style={{ fontWeight: 'bold' }}
							numberOfLines={4}
						>
							{currentTrack.title}
						</Text>
						{currentTrack.artist?.name && (
							<TouchableRipple onPress={onArtistPress}>
								<Text
									variant='bodyMedium'
									style={{ color: colors.onSurfaceVariant }}
									numberOfLines={1}
								>
									{currentTrack.artist.name}
								</Text>
							</TouchableRipple>
						)}
					</View>
					{isBilibiliVideo && (
						<IconButton
							icon={isThumbUp ? 'heart' : 'heart-outline'}
							size={24}
							iconColor={isThumbUp ? colors.error : colors.onSurfaceVariant}
							onPress={onThumbUpPress}
						/>
					)}
				</View>
			</View>
		</View>
	)
}
