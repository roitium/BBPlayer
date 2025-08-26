import { useFetchLyrics } from '@/hooks/mutations/lyrics'
import { useManualSearchLyrics } from '@/hooks/queries/lyrics'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { LyricSearchResult } from '@/types/player/lyrics'
import { formatDurationToHHMMSS } from '@/utils/time'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useState } from 'react'
import { View } from 'react-native'
import {
	ActivityIndicator,
	Button,
	Dialog,
	Searchbar,
	Text,
	TouchableRipple,
} from 'react-native-paper'

const SOURCE_MAP = {
	netease: '网易云',
}

const SearchItem = memo(function SearchItem({
	item,
	onPress,
	disabled,
}: {
	item: LyricSearchResult[0]
	onPress: (item: LyricSearchResult[0]) => void
	disabled: boolean
}) {
	return (
		<TouchableRipple
			style={{ flexDirection: 'column', paddingVertical: 8 }}
			onPress={() => onPress(item)}
			disabled={disabled}
		>
			<View style={{ flexDirection: 'column' }}>
				<Text variant='bodyMedium'>{item.title}</Text>
				<Text variant='bodySmall'>{`${item.artist} - ${formatDurationToHHMMSS(Math.round(item.duration))} - ${SOURCE_MAP[item.source]}`}</Text>
			</View>
		</TouchableRipple>
	)
})

const ManualSearchLyricsModal = ({
	uniqueKey,
	initialQuery,
}: {
	uniqueKey: string
	initialQuery: string
}) => {
	const [query, setQuery] = useState(initialQuery)
	const close = useModalStore((state) => state.close)

	const {
		data: searchResult,
		refetch: searchIt,
		isFetching: isSearching,
	} = useManualSearchLyrics(query, uniqueKey)
	const { mutate: fetchLyrics, isPending: isFetchingLyrics } = useFetchLyrics()
	const handlePressItem = useCallback(
		(item: LyricSearchResult[0]) => {
			fetchLyrics(
				{
					uniqueKey,
					item,
				},
				{ onSuccess: () => close('ManualSearchLyrics') },
			)
		},
		[close, fetchLyrics, uniqueKey],
	)

	const renderItem = useCallback(
		({ item }: { item: LyricSearchResult[0] }) => {
			return (
				<SearchItem
					item={item}
					onPress={handlePressItem}
					disabled={isFetchingLyrics}
				/>
			)
		},
		[handlePressItem, isFetchingLyrics],
	)

	const keyExtractor = useCallback(
		(item: LyricSearchResult[0]) => item.remoteId.toString(),
		[],
	)

	const renderContent = () => {
		if (isSearching) {
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<ActivityIndicator size={'large'} />
				</View>
			)
		}
		if (!searchResult) {
			return (
				<View
					style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
				>
					<Text style={{ textAlign: 'center' }}>
						请修改搜索关键词并回车搜索
					</Text>
				</View>
			)
		}
		if (searchResult.length > 0) {
			return (
				<FlashList
					data={searchResult}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
				/>
			)
		}
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<Text style={{ textAlign: 'center' }}>没有找到匹配的歌词</Text>
			</View>
		)
	}

	return (
		<>
			<Dialog.Title>手动搜索歌词</Dialog.Title>
			<Dialog.Content>
				<Searchbar
					value={query}
					onChangeText={setQuery}
					placeholder='输入歌曲名'
					onSubmitEditing={() => searchIt()}
				/>
			</Dialog.Content>
			<Dialog.ScrollArea style={{ height: 300 }}>
				{renderContent()}
			</Dialog.ScrollArea>
			<Dialog.Actions>
				<Button
					onPress={() => close('ManualSearchLyrics')}
					disabled={isFetchingLyrics}
				>
					取消
				</Button>
			</Dialog.Actions>
		</>
	)
}

export default ManualSearchLyricsModal
