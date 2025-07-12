import { useNavigation } from '@react-navigation/native'
import { View } from 'react-native'
import { IconButton, Text } from 'react-native-paper'

export function PlayerHeader({ onMorePress }: { onMorePress: () => void }) {
	const navigation = useNavigation()

	return (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				paddingHorizontal: 16,
				paddingVertical: 8,
			}}
		>
			<IconButton
				icon='chevron-down'
				size={24}
				onPress={() => navigation.goBack()}
			/>
			<Text
				variant='titleMedium'
				style={{
					flex: 1,
					textAlign: 'center',
				}}
			>
				正在播放
			</Text>
			<IconButton
				icon='dots-vertical'
				size={24}
				onPress={onMorePress}
			/>
		</View>
	)
}
