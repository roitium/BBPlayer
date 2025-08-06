import type { Playlist } from '@/types/core/media'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Divider, Icon, Text } from 'react-native-paper'
import type { RootStackParamList } from '../../../../../types/navigation'

const LocalPlaylistItem = memo(({ item }: { item: Playlist }) => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	return (
		<View key={item.id}>
			<View style={{ marginVertical: 8, overflow: 'hidden' }}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={() => {
						navigation.navigate('PlaylistLocal', { id: String(item.id) })
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<Image
							source={{ uri: item.coverUrl ?? undefined }}
							style={{ width: 48, height: 48, borderRadius: 4 }}
							transition={300}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								numberOfLines={1}
							>
								{item.title}
							</Text>
							<Text variant='bodySmall'>{item.itemCount} 首歌曲</Text>
						</View>
						<Icon
							source='arrow-right'
							size={24}
						/>
					</View>
				</TouchableOpacity>
			</View>
			<Divider />
		</View>
	)
})

LocalPlaylistItem.displayName = 'LocalPlaylistItem'

export default LocalPlaylistItem
