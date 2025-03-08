import { Link, Stack } from 'expo-router'
import { StyleSheet } from 'react-native'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Link
        href='/'
        style={styles.link}
      >
        Go to home screen!
      </Link>
    </>
  )
}

const styles = StyleSheet.create({
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
})
