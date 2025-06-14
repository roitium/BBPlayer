import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation'
import { CommonActions } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { BottomTabParamList } from '../../types/navigation'
import HomePage from './(home)/index'
import LibraryScreen from './(library)/library'
import SearchPage from './(search)/search'
import SettingsPage from './(settings)/index'

const Tab = createNativeBottomTabNavigator<BottomTabParamList>()

export default function TabLayout() {
	return (
		<Tab.Navigator
			screenOptions={{
				tabBarHideOnKeyboard: true,
				headerShown: false,
			}}
		>
			<Tab.Screen
				name='Home'
				component={HomePage}
				options={{
					title: '主页',
					tabBarIcon: ({ color, size }: { color: string; size: number }) => (
						<Icon name='home' color={color} size={size} />
					),
					tabBarLabel: '主页',
				}}
			/>
			<Tab.Screen
				name='Search'
				component={SearchPage}
				options={{
					title: '搜索',
					tabBarIcon: ({ color, size }: { color: string; size: number }) => (
						<Icon name='magnify' color={color} size={size} />
					),
					tabBarLabel: '搜索',
				}}
			/>
			<Tab.Screen
				name='Library'
				component={LibraryScreen}
				options={{
					title: '音乐库',
					tabBarIcon: ({ color, size }: { color: string; size: number }) => (
						<Icon name='bookshelf' color={color} size={size} />
					),
					tabBarLabel: '音乐库',
				}}
			/>
			<Tab.Screen
				name='Settings'
				component={SettingsPage}
				options={{
					title: '设置',
					tabBarIcon: ({ color, size }: { color: string; size: number }) => (
						<Icon name='cog' color={color} size={size} />
					),
					tabBarLabel: '设置',
				}}
			/>
		</Tab.Navigator>
	)
}
