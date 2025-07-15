import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'
import * as Updates from 'expo-updates'

const manifest = Updates.manifest
const metadata = 'metadata' in manifest ? manifest.metadata : undefined
const extra = 'extra' in manifest ? manifest.extra : undefined
const updateGroup =
	metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined

const developement = process.env.NODE_ENV === 'development'

export const navigationIntegration = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

export function initializeSentry() {
	Sentry.init({
		dsn: 'https://893ea8eb3743da1e065f56b3aa5e96f9@o4508985265618944.ingest.us.sentry.io/4508985267191808',
		debug: false,
		tracesSampleRate: 0.7,
		sendDefaultPii: true,
		integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],
		enableNativeFramesTracking: !isRunningInExpoGo(),
		enabled: !developement,
		environment: developement ? 'development' : 'production',
	})

	const scope = Sentry.getGlobalScope()

	scope.setTag('expo-update-id', Updates.updateId)
	scope.setTag('expo-is-embedded-update', Updates.isEmbeddedLaunch)

	if (typeof updateGroup === 'string') {
		scope.setTag('expo-update-group-id', updateGroup)

		const owner = extra?.expoClient?.owner ?? '[account]'
		const slug = extra?.expoClient?.slug ?? '[project]'
		scope.setTag(
			'expo-update-debug-url',
			`https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
		)
	} else if (Updates.isEmbeddedLaunch) {
		scope.setTag('expo-update-debug-url', 'not applicable for embedded updates')
	}

	// 设置全局错误处理器，捕获未被处理的 JS 错误
	if (!developement) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const errorUtils = (global as any).ErrorUtils
		if (errorUtils) {
			const originalErrorHandler = errorUtils.getGlobalHandler()

			errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
				Sentry.captureException(error, {
					tags: {
						scope: 'GlobalErrorHandler',
						isFatal: String(isFatal),
					},
				})

				originalErrorHandler(error, isFatal)
			})
		}
	}
}
