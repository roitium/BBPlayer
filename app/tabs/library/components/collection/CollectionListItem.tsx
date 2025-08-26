import type { BilibiliCollection } from '@/types/apis/bilibili'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Divider, Icon, Text } from 'react-native-paper'
import type { RootStackParamList } from '../../../../../types/navigation'

const CollectionListItem = memo(({ item }: { item: BilibiliCollection }) => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	return (
		<View key={item.id}>
			<View style={{ marginVertical: 8, overflow: 'hidden' }}>
				<TouchableOpacity
					activeOpacity={0.7}
					disabled={item.state === 1}
					onPress={() => {
						if (item.attr === 0) {
							navigation.navigate('PlaylistCollection', {
								id: String(item.id),
							})
						} else {
							navigation.navigate('PlaylistFavorite', { id: String(item.id) })
						}
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<Image
							source={{ uri: item.cover }}
							recyclingKey={item.id.toString()}
							style={{ width: 48, height: 48, borderRadius: 4 }}
							transition={300}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								style={{ paddingRight: 8 }}
							>
								{item.title}
							</Text>
							<Text variant='bodySmall'>
								{item.state === 0 ? item.upper.name : '已失效'} •{''}
								{item.media_count} 首歌曲
							</Text>
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

CollectionListItem.displayName = 'CollectionListItem'

export default CollectionListItem
