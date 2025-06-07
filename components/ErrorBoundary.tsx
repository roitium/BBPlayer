import { Text, View } from 'react-native'
import { Button } from 'react-native-paper'
import TouchableOpacity from './TouchableOpacity'

export default function GlobalErrorFallback({
  error,
  resetError,
}: {
  error: unknown
  resetError: () => void
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Text style={{ marginBottom: 8, fontWeight: 'bold', fontSize: 20 }}>
        出错了
      </Text>
      <Text style={{ marginBottom: 20, textAlign: 'center' }}>
        {error instanceof Error && error.message
          ? error.message
          : JSON.stringify(error)}
      </Text>
      <TouchableOpacity
        style={{
          borderRadius: 4,
          backgroundColor: '#3b82f6',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 8,
          paddingBottom: 8,
        }}
        onPress={resetError}
      >
        <Button
          labelStyle={{ fontWeight: 'bold' }}
          buttonColor='white'
        >
          重试
        </Button>
      </TouchableOpacity>
    </View>
  )
}
