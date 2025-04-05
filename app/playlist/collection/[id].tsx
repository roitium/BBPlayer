import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { Text } from 'react-native-paper'
import { router } from 'expo-router'

export default function CollectionPage() {
  const { id } = useLocalSearchParams()

  // @ts-ignore 故意定向到一个不存在的页面，触发 404
  if (typeof id !== 'string') return router.replace('/not-found')

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant='titleLarge'>
        正在开发中:
        {id}
      </Text>
    </View>
  )
}
