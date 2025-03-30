const { withNativeWind } = require('nativewind/metro')
const { getSentryExpoConfig } = require('@sentry/react-native/metro')
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config')

const config = getSentryExpoConfig(__dirname, {
  annotateReactComponents: true,
})

const config1 = withNativeWind(config, { input: './css/global.css' })

module.exports = wrapWithReanimatedMetroConfig(config1)
