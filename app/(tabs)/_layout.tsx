import { IconSymbol } from '@/components/ui/IconSymbol'
import { MaterialBottomTabs as Tab } from '@/components/MaterialBottomTabBar'
import { useTheme } from 'react-native-paper'

export default function TabLayout() {
  const theme = useTheme()
  return (
    <Tab
      screenOptions={{
        tabBarHideOnKeyboard: true,
      }}
      sceneAnimationEnabled
      sceneAnimationType='opacity'
      theme={theme}
    >
      <Tab.Screen
        name='(home)/index'
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
        name='(search)/search'
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
      <Tab.Screen
        name='(library)/library'
        options={{
          title: 'Library',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol
              size={26}
              name='book.fill'
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name='test/index'
        options={{
          title: '测试',
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol
              size={26}
              name='wrench.fill'
              color={color}
            />
          ),
        }}
      />
    </Tab>
  )
}
