import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation'
import Icon from '@react-native-vector-icons/material-design-icons'
import { useTheme } from 'react-native-paper'
import type { BottomTabParamList } from '../../types/navigation'
import HomePage from './home/index'
import LibraryScreen from './library/[tab]'
import SettingsPage from './settings/index'

const Tab = createNativeBottomTabNavigator<BottomTabParamList>()

interface nonNullableIcon {
	uri: string
	scale: number
}

const homeIcon = Icon.getImageSourceSync('home', 24) as nonNullableIcon
const libraryIcon = Icon.getImageSourceSync('bookshelf', 24) as nonNullableIcon
const settingsIcon = Icon.getImageSourceSync('cog', 24) as nonNullableIcon

export default function TabLayout() {
	const themes = useTheme().colors

	return (
		<Tab.Navigator
			disablePageAnimations
			tabBarActiveTintColor={themes.primary}
			activeIndicatorColor={themes.primaryContainer}
			tabBarStyle={{ backgroundColor: themes.elevation.level1 }}
			initialRouteName='Home'
		>
			<Tab.Screen
				name='Home'
				component={HomePage}
				options={{
					title: '主页',
					tabBarIcon: () => homeIcon,
					tabBarLabel: '主页',
					lazy: false,
				}}
			/>
			<Tab.Screen
				name='Library'
				component={LibraryScreen}
				options={{
					title: '音乐库',
					tabBarIcon: () => libraryIcon,
					tabBarLabel: '音乐库',
					lazy: false,
				}}
			/>
			<Tab.Screen
				name='Settings'
				component={SettingsPage}
				options={{
					title: '设置',
					tabBarIcon: () => settingsIcon,
					tabBarLabel: '设置',
					lazy: false,
				}}
			/>
		</Tab.Navigator>
	)
}
