import { neteaseApi } from '@/lib/api/netease/api'
import { FileSystemError } from '@/lib/errors'
import { mergeLrc, parseLrc } from '@/utils/lyrics'
import { useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'

export const userQueryKeys = {
	all: ['netease', 'lyrics'] as const,
	smartFetchLyrics: (uniqueKey?: string, keyword?: string) =>
		[...userQueryKeys.all, 'smartFetchLyrics', uniqueKey, keyword] as const,
}

export const useSmartFetchLyrics = (uniqueKey?: string, keyword?: string) => {
	const enabled = !!uniqueKey && !!keyword
	return useQuery({
		queryKey: userQueryKeys.smartFetchLyrics(uniqueKey, keyword),
		queryFn: async () => {
			const basePath = FileSystem.documentDirectory
			if (!basePath) {
				throw new FileSystemError('无法获取文件系统目录')
			}
			const result = await neteaseApi.smartFetchLyrics({
				basePath,
				uniqueKey: uniqueKey!,
				keyword: keyword!,
			})
			if (result.isErr()) {
				throw result.error
			}
			if (!result.value) {
				return '未匹配到歌词，请手动搜索'
			}
			const parsedRawLyrics = parseLrc(result.value.lrc.lyric)
			if (parsedRawLyrics === null) {
				return result.value.lrc.lyric
			}
			if (!result.value.tlyric) {
				return parsedRawLyrics
			}
			const parsedTranslatedLyrics = parseLrc(result.value.tlyric.lyric)
			if (parsedTranslatedLyrics === null) {
				return parsedRawLyrics
			}
			const mergedLyrics = mergeLrc(parsedRawLyrics, parsedTranslatedLyrics)
			return mergedLyrics
		},
		enabled,
		staleTime: 24 * 60 * 1000,
	})
}
