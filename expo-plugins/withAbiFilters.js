const {
	withGradleProperties,
	withAppBuildGradle,
} = require('expo/config-plugins')

const withAbiFilters = (config, { abiFilters = ['arm64-v8a'] } = {}) => {
	// Set gradle.properties
	config = withGradleProperties(config, (config) => {
		// Convert array to comma-separated string for gradle.properties
		const architecturesString = abiFilters.join(',')

		// Set the reactNativeArchitectures property
		config.modResults = config.modResults.filter(
			(item) => !item.key || item.key !== 'reactNativeArchitectures',
		)

		config.modResults.push({
			type: 'property',
			key: 'reactNativeArchitectures',
			value: architecturesString,
		})

		return config
	})

	// Set build.gradle ndk.abiFilters
	config = withAppBuildGradle(config, (config) => {
		const abiFiltersString = abiFilters.map((abi) => `"${abi}"`).join(', ')

		// Add ndk abiFilters to defaultConfig
		if (config.modResults.contents.includes('defaultConfig {')) {
			config.modResults.contents = config.modResults.contents.replace(
				/(defaultConfig\s*\{[^}]*versionName\s+[^}]*)/,
				`$1
        
        ndk {
            abiFilters ${abiFiltersString}
        }`,
			)
		}

		return config
	})

	return config
}

module.exports = withAbiFilters
