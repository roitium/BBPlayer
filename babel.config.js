module.exports = (api) => {
  api.cache(true)
  return {
    presets: [['babel-preset-expo']],
    env: {
      production: {
        plugins: ['react-native-paper/babel'],
      },
    },
    plugins: ['react-native-reanimated/plugin'],
  }
}
