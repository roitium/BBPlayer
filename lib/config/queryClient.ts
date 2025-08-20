import appStore from '@/hooks/stores/appStore'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import * as Sentry from '@sentry/react-native'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ThirdPartyError } from '../errors'
import { BilibiliApiError } from '../errors/bilibili'

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
			toastAndLogError('查询失败', error, 'Query')

			if (error instanceof BilibiliApiError && error.data.msgCode === -101) {
				toast.error('登录状态失效，请重新登录')
				appStore.getState().setQrCodeLoginModalVisible(true)
			}

			// 这个错误属于三方依赖的错误，不应该报告到 Sentry
			if (error instanceof ThirdPartyError) {
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
