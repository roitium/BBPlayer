import { useFetchLyrics } from '@/hooks/mutations/lyrics'
import { useManualSearchLyrics } from '@/hooks/queries/lyrics'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { LyricSearchResult } from '@/types/player/lyrics'
import { FlashList } from '@shopify/flash-list'
import { memo, useCallback, useState } from 'react'
import { View } from 'react-native'
import {
	Button,
	Dialog,
	Searchbar,
	Text,
	TouchableRipple,
} from 'react-native-paper'

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
				<Text>{item.title}</Text>
				<Text>{`${item.artist} - ${item.duration}s - ${item.source}`}</Text>
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

	const { data: searchResult, refetch: searchIt } = useManualSearchLyrics(
		query,
		uniqueKey,
	)
	const { mutate: fetchLyrics, isPending: isFetchingLyrics } = useFetchLyrics()
	const handlePressItem = useCallback(
		(item: LyricSearchResult[0]) => {
			fetchLyrics({
				uniqueKey,
				item,
			})
		},
		[fetchLyrics, uniqueKey],
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

	return (
		<>
			<Dialog.Title>手动搜索歌词</Dialog.Title>
			<Dialog.Content>
				<Searchbar
					value={query}
					onChangeText={setQuery}
					placeholder='输入歌曲名'
					onSubmitEditing={() => {
						console.log('onSubmitEditing')
						void searchIt()
					}}
				/>
			</Dialog.Content>
			<Dialog.ScrollArea style={{ height: 300 }}>
				<FlashList
					data={searchResult ?? []}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListEmptyComponent={
						<Text style={{ textAlign: 'center' }}>没有找到匹配的歌词</Text>
					}
				/>
			</Dialog.ScrollArea>
			<Dialog.Actions>
				<Button onPress={() => close('ManualSearchLyrics')}>取消</Button>
			</Dialog.Actions>
		</>
	)
}

export default ManualSearchLyricsModal
