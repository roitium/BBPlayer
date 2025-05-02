module.exports = (api) => {
  api.cache(true)
  return {
    presets: [['babel-preset-expo']],
    env: {
      production: {
        plugins: ['react-native-paper/babel'],
      },
    },
    plugins: ['babel-plugin-react-compiler', 'react-native-reanimated/plugin'],
  }
}
