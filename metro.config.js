const { withNativeWind } = require('nativewind/metro')
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname, {
  annotateReactComponents: true,
})

module.exports = withNativeWind(config, { input: './css/global.css' })
