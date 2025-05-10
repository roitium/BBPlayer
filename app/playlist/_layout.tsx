import { Stack } from 'expo-router'

export default function PlaylistLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='favorite/[id]'
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='collection/[id]'
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='multipage/[bvid]'
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='uploader/[mid]'
        options={{ headerShown: false }}
      />
    </Stack>
  )
}
