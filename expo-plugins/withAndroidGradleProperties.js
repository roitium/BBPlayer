const { withGradleProperties } = require('expo/config-plugins')

const newProperties = {
	'org.gradle.jvmargs':
		'-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+UseParallelGC -Dkotlin.daemon.jvm.options="-Xmx2g"',
	'org.gradle.workers.max': '4',
}

const withAndroidGradleProperties = (config) => {
	return withGradleProperties(config, (config) => {
		for (const [key, value] of Object.entries(newProperties)) {
			const existingProp = config.modResults.find(
				(prop) => prop.type === 'property' && prop.key === key,
			)

			if (existingProp) {
				existingProp.value = value
			} else {
				config.modResults.push({
					type: 'property',
					key: key,
					value: value,
				})
			}
		}

		return config
	})
}

module.exports = withAndroidGradleProperties
