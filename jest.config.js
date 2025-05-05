/** @type {import('jest').Config} */
const config = {
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  preset: 'jest-expo',
}

export default config
