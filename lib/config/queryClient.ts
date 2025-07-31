import { ApiCallingError } from '@/lib/core/errors'
import log from '@/utils/log'
import toast from '@/utils/toast'
import * as Sentry from '@sentry/react-native'
import { QueryCache, QueryClient } from '@tanstack/react-query'

const rootLog = log.extend('ROOT')

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			refetchOnWindowFocus: true,
			refetchOnMount: true,
			refetchOnReconnect: true,
			refetchInterval: false,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(`请求 ${query.queryKey} 失败`, {
				description: error.message,
				duration: Number.POSITIVE_INFINITY,
			})
			rootLog.error(`请求 ${query.queryKey} 失败：`, error)

			// 这个错误属于三方依赖的错误，不应该报告到 Sentry
			if (error instanceof ApiCallingError) {
				return
			}

			Sentry.captureException(error, {
				tags: {
					scope: 'QueryCache',
					queryKey: JSON.stringify(query.queryKey),
				},
				extra: {
					queryHash: query.queryHash,
					retry: query.options.retry,
				},
			})
		},
	}),
})
