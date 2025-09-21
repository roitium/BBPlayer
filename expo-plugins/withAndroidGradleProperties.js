const { withGradleProperties } = require('expo/config-plugins')

const GRADLE_XMX = process.env.GRADLE_XMX || '4g'
const KOTLIN_XMX = process.env.KOTLIN_XMX || '2g'
const WORKERS_MAX =
	process.env.ORG_GRADLE_WORKERS_MAX || process.env.GRADLE_WORKERS || '4'

const newProperties = {
	'org.gradle.jvmargs': `-Xmx${GRADLE_XMX} -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8`,
	'kotlin.daemon.jvm.args': `-Xmx${KOTLIN_XMX}`,
	'org.gradle.workers.max': WORKERS_MAX,
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
