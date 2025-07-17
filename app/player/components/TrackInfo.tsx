import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { Image } from 'expo-image'
import { Dimensions, TouchableOpacity, View } from 'react-native'
import { IconButton, Text, useTheme } from 'react-native-paper'

export function TrackInfo({
	isFavorite,
	onFavoritePress,
}: {
	isFavorite: boolean
	onFavoritePress: () => void
}) {
	const { colors } = useTheme()
	const currentTrack = useCurrentTrack()
	const { width: screenWidth } = Dimensions.get('window')

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
				<TouchableOpacity activeOpacity={0.8}>
					<Image
						source={{ uri: currentTrack.coverUrl }}
						style={{
							width: screenWidth - 80,
							height: screenWidth - 80,
							borderRadius: 16,
						}}
						transition={300}
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
						<Text
							variant='bodyMedium'
							style={{ color: colors.onSurfaceVariant }}
							numberOfLines={1}
						>
							{currentTrack.artist}
						</Text>
					</View>
					<IconButton
						icon={isFavorite ? 'heart' : 'heart-outline'}
						size={24}
						iconColor={isFavorite ? colors.error : colors.onSurfaceVariant}
						onPress={onFavoritePress}
					/>
				</View>
			</View>
		</View>
	)
}
