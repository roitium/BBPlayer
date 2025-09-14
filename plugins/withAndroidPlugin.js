const configPlugins = require('expo/config-plugins')

const { withAndroidManifest, withStringsXml } = configPlugins

const withAndroidPlugin = (config) => {
	const configWithStrings = withStringsXml(config, (config) => {
		const strings = config?.modResults?.resources?.string

		if (strings) {
			strings.push({
				$: {
					name: 'rntp_temporary_channel_id',
				},
				_: 'bbplayer',
			})
			strings.push({
				$: {
					name: 'rntp_temporary_channel_name',
				},
				_: 'bbplayer',
			})
			strings.push({
				$: {
					name: 'playback_channel_name',
				},
				_: 'BBPlayer',
			})
		}

		return config
	})

	return withAndroidManifest(configWithStrings, (config) => {
		const intents = config?.modResults?.manifest?.queries?.[0]?.intent

		if (intents) {
			intents[0].data?.push({
				$: {
					'android:mimeType': 'text/plain',
				},
			})
		}

		return config
	})
}

module.exports = withAndroidPlugin
