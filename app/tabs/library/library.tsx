import { useState } from 'react'
import { View } from 'react-native'
import { SegmentedButtons, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CollectionListComponent from './components/collection/CollectionList'
import FavoriteFolderListComponent from './components/favorite/FavoriteFolderList'
import MultiPageVideosListComponent from './components/multipage/MultiPageVideosList'

export default function LibraryScreen() {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const [value, setValue] = useState('favorite')

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<View
				style={{
					paddingTop: insets.top + 8,
					paddingHorizontal: 16,
					paddingBottom: 8,
				}}
			>
				<View
					style={{
						marginBottom: 16,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<Text
						variant='headlineSmall'
						style={{ fontWeight: 'bold' }}
					>
						音乐库
					</Text>
				</View>

				<SegmentedButtons
					value={value}
					onValueChange={setValue}
					buttons={[
						{ value: 'favorite', label: '收藏夹' },
						{ value: 'collection', label: '合集' },
						{ value: 'multipage', label: '分 p' },
					]}
					style={{
						marginBottom: 16,
						width: '100%',
						alignSelf: 'center',
					}}
				/>
			</View>

			<View style={{ flex: 1, paddingHorizontal: 16 }}>
				{value === 'favorite' && <FavoriteFolderListComponent />}
				{value === 'collection' && <CollectionListComponent />}
				{value === 'multipage' && <MultiPageVideosListComponent />}
			</View>
		</View>
	)
}
