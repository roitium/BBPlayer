import { lyricsQueryKeys } from '@/hooks/queries/lyrics'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { queryClient } from '@/lib/config/queryClient'
import lyricService from '@/lib/services/lyricService'
import type { ParsedLrc } from '@/types/player/lyrics'
import { toastAndLogError } from '@/utils/log'
import { mergeLrc, parseLrc } from '@/utils/lyrics'
import toast from '@/utils/toast'
import { useState } from 'react'
import { Button, Dialog, TextInput } from 'react-native-paper'

export default function EditLyricsModal({
	uniqueKey,
	lyrics,
}: {
	uniqueKey: string
	lyrics: ParsedLrc
}) {
	const close = useModalStore((state) => state.close)
	const [original, setOriginal] = useState(lyrics.rawOriginalLyrics)
	const [translated, setTranslated] = useState(lyrics.rawTranslatedLyrics)

	const handleConfirm = async () => {
		const parsedOriginal = parseLrc(original)
		if (!translated) {
			const result = await lyricService.saveLyricsToFile(
				parsedOriginal,
				uniqueKey,
			)
			if (result.isErr()) {
				toastAndLogError(
					'保存歌词失败',
					result.error,
					'Components.EditLyricsModal',
				)
				return
			}
			queryClient.setQueryData(
				lyricsQueryKeys.smartFetchLyrics(uniqueKey),
				result.value,
			)
			toast.success('歌词保存成功')
			close('EditLyrics')
			return
		}
		const parsedTranslated = parseLrc(translated)
		const merged = mergeLrc(parsedOriginal, parsedTranslated)
		const result = await lyricService.saveLyricsToFile(merged, uniqueKey)
		if (result.isErr()) {
			toastAndLogError(
				'保存歌词失败',
				result.error,
				'Components.EditLyricsModal',
			)
			return
		}
		queryClient.setQueryData(
			lyricsQueryKeys.smartFetchLyrics(uniqueKey),
			result.value,
		)
		toast.success('歌词保存成功')
		close('EditLyrics')
	}

	return (
		<>
			<Dialog.Title>编辑歌词</Dialog.Title>
			<Dialog.Content style={{ gap: 8 }}>
				<TextInput
					label='原始歌词'
					value={original}
					onChangeText={setOriginal}
					mode='outlined'
					numberOfLines={5}
					multiline
					style={{ maxHeight: 200 }}
					textAlignVertical='top'
				/>
				{lyrics.rawTranslatedLyrics && (
					<TextInput
						label='翻译歌词'
						value={translated}
						onChangeText={setTranslated}
						mode='outlined'
						numberOfLines={5}
						multiline
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
						disabled={!original}
					/>
				)}
			</Dialog.Content>
			<Dialog.Actions>
				<Button onPress={() => close('EditLyrics')}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</>
	)
}
