import { videoDataQueryKeys } from '@/hooks/queries/bilibili/video'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { queryClient } from '@/lib/config/queryClient'
import { toastAndLogError } from '@/utils/log'
import { returnOrThrowAsync } from '@/utils/neverthrow-utils'
import toast from '@/utils/toast'
import { useMutation } from '@tanstack/react-query'

export const useThumbUpVideo = () => {
	return useMutation({
		mutationFn: ({ bvid, like }: { bvid: string; like: boolean }) =>
			returnOrThrowAsync(
				bilibiliApi.thumbUpVideo(bvid, like).map((res) => res ?? undefined),
			),
		onSuccess: (_, { bvid, like }) => {
			queryClient.setQueryData(
				videoDataQueryKeys.getVideoIsThumbUp(bvid),
				like ? 1 : 0,
			)
			toast.success(`${like ? '点赞' : '取消点赞'}成功`)
		},
		onError: (err, { like }) => {
			toastAndLogError(`${like ? '点赞' : '取消点赞'}失败`, err, 'UI.Player')
		},
	})
}
