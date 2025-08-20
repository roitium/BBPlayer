import type { RootStackParamList } from '@/types/navigation'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Button, StyleSheet, Text, View } from 'react-native'

const NotFoundScreen: React.FC = () => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()

	const handleGoHome = () => {
		navigation.navigate('MainTabs', { screen: 'Home' })
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>404</Text>
			<Text style={styles.message}>你正在找的页面不见了！</Text>
			<Button
				title='Go to Home Screen'
				onPress={handleGoHome}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#f5f5f5', // A light grey background
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333', // Darker text for title
		marginBottom: 8,
	},
	message: {
		fontSize: 16,
		color: '#666', // Slightly lighter text for message
		textAlign: 'center',
		marginBottom: 20,
	},
})

export default NotFoundScreen
