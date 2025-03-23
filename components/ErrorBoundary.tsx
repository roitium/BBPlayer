import { View, Text, TouchableOpacity } from 'react-native'

export default function GlobalErrorFallback({
  error,
  resetError,
}: { error: unknown; resetError: () => void }) {
  return (
    <View className='flex-1 items-center justify-center p-5'>
      <Text className='mb-2 font-bold text-xl'>出错了</Text>
      <Text className='mb-5 text-center'>
        {error instanceof Error && error.message
          ? error.message
          : JSON.stringify(error)}
      </Text>
      <TouchableOpacity
        className='rounded bg-blue-500 px-5 py-2'
        onPress={resetError}
      >
        <Text className='font-bold text-white'>重试</Text>
      </TouchableOpacity>
    </View>
  )
}
