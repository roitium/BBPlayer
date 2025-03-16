import { Stack } from 'expo-router'

export default function PlaylistLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='[favorite]'
        options={{ headerShown: false }}
      />
    </Stack>
  )
}
