import type { Playlist } from '@/types/core/media'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TouchableOpacity } from 'react-native'
import { Surface, Text } from 'react-native-paper'

export default function PlaylistItem({ item }: { item: Playlist }) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const handlePress = () => {
		navigation.navigate('PlaylistFavorite', { id: String(item.id) })
	}

	return (
		<Surface
			style={{
				marginVertical: 8,
				marginRight: 16,
				width: 160,
				overflow: 'hidden',
				borderRadius: 8,
				padding: 8,
			}}
			elevation={1}
		>
			<TouchableOpacity
				key={item.id}
				activeOpacity={0.5}
				onPress={handlePress}
			>
				<Text
					variant='titleSmall'
					numberOfLines={1}
				>
					{item.title}
				</Text>
				<Text variant='bodySmall'>{item.count} 首歌曲</Text>
			</TouchableOpacity>
		</Surface>
	)
}
