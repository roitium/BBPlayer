import { useNavigation } from '@react-navigation/native'
import { Appbar } from 'react-native-paper'

export function PlaylistAppBar({ title }: { title?: string }) {
	const navigation = useNavigation()
	return (
		<Appbar.Header style={{ backgroundColor: 'rgba(0,0,0,0)', zIndex: 10 }}>
			<Appbar.BackAction onPress={() => navigation.goBack()} />
			{title && (
				<Appbar.Content
					title={title}
					titleStyle={{ fontSize: 18 }}
				/>
			)}
		</Appbar.Header>
	)
}
