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
							switch (event.kind) {
								case 'CompileSuccess': {
									console.log(`✅ Compiled: ${filename}`)
									break
								}
								case 'CompileError': {
									console.log(
										`❌ Skipped: ${filename} [reason: ${event.detail.reason}] [description: ${event.detail.description}] [loc: ${event.detail.loc.start}] [suggestion: ${event.detail.suggestions}]`,
									)
									break
								}
								default: {
								}
							}
						},
					},
				},
			],
			['inline-import', { extensions: ['.sql'] }],
		],
	}
}
