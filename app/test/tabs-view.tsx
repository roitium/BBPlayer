import { StyleSheet, Text, View } from 'react-native'
import PagerView from 'react-native-pager-view'

const MyPager = () => {
	return (
		<PagerView
			style={styles.pagerView}
			initialPage={0}
		>
			<View key='1'>
				<Text>First page</Text>
			</View>
			<View key='2'>
				<Text>Second page</Text>
			</View>
		</PagerView>
	)
}

export default MyPager

const styles = StyleSheet.create({
	pagerView: {
		flex: 1,
	},
})
