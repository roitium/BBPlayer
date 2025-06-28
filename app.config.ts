import type { ConfigContext, ExpoConfig } from 'expo/config'
import { version } from './package.json'
import 'ts-node/register'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default ({ config }: ConfigContext): ExpoConfig => ({
	name: 'BBPlayer',
	slug: 'bbplayer',
	version: version,
	orientation: 'portrait',
	icon: './assets/images/icon.png',
	scheme: 'bbplayer',
	userInterfaceStyle: 'automatic',
	newArchEnabled: false,
	platforms: ['android'],
	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/adaptive-icon.png',
			monochromeImage: './assets/images/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'com.roitium.BBPlayer',
		versionCode: 47,
		edgeToEdgeEnabled: true,
		runtimeVersion: version,
	},
	plugins: [
		'./plugins/withAndroidPlugin',
		[
			'expo-dev-client',
			{
				launchMode: 'most-recent',
			},
		],
		[
			'expo-splash-screen',
			{
				image: './assets/images/splash-icon.png',
				imageWidth: 200,
				resizeMode: 'contain',
			},
		],
		[
			'@sentry/react-native/expo',
			{
				url: 'https://sentry.io/',
				project: 'bbplayer',
				organization: 'roitium',
			},
		],
		[
			'expo-build-properties',
			{
				android: {
					usesCleartextTraffic: true,
				},
			},
		],
		[
			'expo-asset',
			{
				assets: [],
			},
		],
		'expo-font',
		[
			'react-native-bottom-tabs',
			{
				theme: 'material3-dynamic',
			},
		],
		[
			'react-native-edge-to-edge',
			{
				android: {
					parentTheme: 'Material3',
				},
			},
		],
		'expo-web-browser',
	],
	experiments: {
		reactCompiler: true,
	},
	extra: {
		eas: {
			projectId: '1cbd8d50-e322-4ead-98b6-4ee8b6f2a707',
		},
	},
	owner: 'roitium',
	updates: {
		url: 'https://u.expo.dev/1cbd8d50-e322-4ead-98b6-4ee8b6f2a707',
	},
	ios: {
		bundleIdentifier: 'com.roitium.BBPlayer',
	},
})
