import React from 'react'
import { View, Text, Button, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'

const NotFoundScreen: React.FC = () => {
	const navigation = useNavigation()

	const handleGoHome = () => {
		// Assuming 'MainTabs' is the name of your tab navigator
		// and 'Home' is the name of the home screen route in that navigator
		navigation.navigate('MainTabs', { screen: 'Home' })
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Screen Not Found</Text>
			<Text style={styles.message}>
				Oops! The screen you are looking for does not exist.
			</Text>
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
