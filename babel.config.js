module.exports = (api) => {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel', 'transform-remove-console'],
      },
    },
  }
}
