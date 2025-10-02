import useAppStore from '@/hooks/stores/useAppStore'
import log from '@/utils/log'
import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'
import * as Updates from 'expo-updates'

const logger = log.extend('Utils.Sentry')

const manifest = Updates.manifest
const metadata = 'metadata' in manifest ? manifest.metadata : undefined
const extra = 'extra' in manifest ? manifest.extra : undefined
const updateGroup =
	metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined

const developement = process.env.NODE_ENV === 'development'

export const navigationIntegration = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

logger.info(
	'Sentry 启用状态为：',
	!developement && useAppStore.getState().settings.enableSentryReport,
)

export function initializeSentry() {
	Sentry.init({
		dsn: 'https://893ea8eb3743da1e065f56b3aa5e96f9@o4508985265618944.ingest.us.sentry.io/4508985267191808',
		debug: false,
		tracesSampleRate: 0.7,
		sendDefaultPii: false,
		integrations: [navigationIntegration],
		enableNativeFramesTracking: !isRunningInExpoGo(),
		enabled:
			!developement && useAppStore.getState().settings.enableSentryReport,
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const errorUtils = (global as any).ErrorUtils
		if (errorUtils) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			const originalErrorHandler = errorUtils.getGlobalHandler()

			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
				Sentry.captureException(error, {
					tags: {
						scope: 'GlobalErrorHandler',
						isFatal: String(isFatal),
					},
				})

				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				originalErrorHandler(error, isFatal)
			})
		}
	}
}
