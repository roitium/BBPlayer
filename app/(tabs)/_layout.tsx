import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { CommonActions } from '@react-navigation/native'
import { BottomNavigation } from 'react-native-paper'

// Import screen components
import HomePage from 'app/(tabs)/(home)/index.tsx'
import SearchPage from 'app/(tabs)/(search)/search.tsx'
import LibraryScreen from 'app/(tabs)/(library)/library.tsx'
import AboutPage from 'app/(tabs)/(about)/index.tsx'

const Tab = createBottomTabNavigator()

export default function TabLayout() {
	return (
		<Tab.Navigator
			tabBar={({ navigation, state, descriptors, insets }) => (
				<BottomNavigation.Bar
					navigationState={state}
					safeAreaInsets={insets}
					onTabPress={({ route, preventDefault }) => {
						const event = navigation.emit({
							type: 'tabPress',
							target: route.key,
							canPreventDefault: true,
						})

						if (event.defaultPrevented) {
							preventDefault()
						} else {
							navigation.dispatch({
								...CommonActions.navigate(route.name, route.params),
								target: state.key,
							})
						}
					}}
					renderIcon={({ route, focused, color }) =>
						descriptors[route.key].options.tabBarIcon?.({
							focused,
							color,
							size: 24,
						}) || null
					}
					getLabelText={({ route }) => {
						const { options } = descriptors[route.key]
						const label =
							typeof options.tabBarLabel === 'string'
								? options.tabBarLabel
								: typeof options.title === 'string'
									? options.title
									: route.name

						return label
					}}
				/>
			)}
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
					tabBarIcon: ({ color }: { color: string }) => (
						<MaterialCommunityIcons
							name='home'
							color={color}
							size={26}
						/>
					),
					tabBarLabel: '主页',
				}}
			/>
			<Tab.Screen
				name='Search'
				component={SearchPage}
				options={{
					title: '搜索',
					tabBarIcon: ({ color }: { color: string }) => (
						<MaterialCommunityIcons
							name='magnify'
							color={color}
							size={26}
						/>
					),
					tabBarLabel: '搜索',
				}}
			/>
			<Tab.Screen
				name='Library'
				component={LibraryScreen}
				options={{
					title: '音乐库',
					tabBarIcon: ({ color }: { color: string }) => (
						<MaterialCommunityIcons
							name='library-shelves'
							color={color}
							size={26}
						/>
					),
					tabBarLabel: '音乐库',
				}}
			/>
			<Tab.Screen
				name='About'
				component={AboutPage}
				options={{
					title: '关于',
					tabBarIcon: ({ color }: { color: string }) => (
						<MaterialCommunityIcons
							name='information'
							color={color}
							size={26}
						/>
					),
					tabBarLabel: '关于',
				}}
			/>
		</Tab.Navigator>
	)
}
