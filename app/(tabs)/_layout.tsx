import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { CommonActions } from '@react-navigation/native'
import { Tabs } from 'expo-router'
import { BottomNavigation } from 'react-native-paper'

export default function TabLayout() {
  return (
    <Tabs
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
      <Tabs.Screen
        name='(home)/index'
        options={{
          title: '主页',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='home'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='(search)/search'
        options={{
          title: '搜索',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='magnify'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='(library)/library'
        options={{
          title: '音乐库',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='library-shelves'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='(about)/index'
        options={{
          title: '关于',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='information'
              color={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  )
}
