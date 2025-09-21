export default (api) => {
	api.cache(true)
	return {
		presets: [['babel-preset-expo']],
		env: {
			production: {
				plugins: ['react-native-paper/babel', 'transform-remove-console'],
			},
		},
		plugins: [
			[
				'babel-plugin-react-compiler',
				{
					logLevel: 'verbose',

					logger: {
						logEvent(filename, event) {
							if (event.kind === 'CompileSuccess') {
								console.log('✔ Compiled:', filename)
							} else {
								console.warn('ℹ Compilation error in:', filename, event.reason)
							}
						},
					},
				},
			],
			['inline-import', { extensions: ['.sql'] }],
		],
	}
}
