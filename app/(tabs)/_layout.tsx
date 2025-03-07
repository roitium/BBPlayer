import { IconSymbol } from '@/components/ui/IconSymbol'

import { createMaterialBottomTabNavigator } from 'react-native-paper/react-navigation'
import HomeScreen from './(home)'
import SearchPage from './(search)'

const Tab = createMaterialBottomTabNavigator()

export default function TabLayout() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name='home'
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol
              size={26}
              name='house.fill'
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name='search'
        component={SearchPage}
        options={{
          title: 'Search',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol
              size={26}
              name='magnifyingglass'
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
