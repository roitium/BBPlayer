import { useState } from 'react'
import { View } from 'react-native'
import { Searchbar } from 'react-native-paper'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function SearchPage() {
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <View
      className='flex'
      style={{ paddingTop: insets.top + 20 }}
    >
      <View className='mx-4'>
        <Searchbar
          placeholder='Search'
          onChangeText={setSearchQuery}
          className=''
          value={searchQuery}
        />
      </View>
      <View className='mt-4 ml-8'>
        <Text variant='titleMedium'>最近搜索</Text>
        <View className='flex-row flex-wrap'>
          <Text className='m-2'>搜索历史</Text>
          <Text className='m-2'>搜索历史</Text>
          <Text className='m-2'>搜索历史</Text>
        </View>
      </View>
      <View className='mt-4 ml-8'>
        <Text variant='titleMedium'>热门搜索</Text>
        <View className='flex-row flex-wrap'>
          <Text className='m-2'>搜索历史</Text>
          <Text className='m-2'>搜索历史</Text>
          <Text className='m-2'>搜索历史</Text>
        </View>
      </View>
    </View>
  )
}
