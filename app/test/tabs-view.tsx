import Icon from '@react-native-vector-icons/material-design-icons'
import * as React from 'react'
import { useWindowDimensions, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SceneMap, TabBar, TabView } from 'react-native-tab-view'
import CollectionListComponent from '../tabs/library/components/collection/CollectionList'
import FavoriteFolderListComponent from '../tabs/library/components/favorite/FavoriteFolderList'
import MultiPageVideosListComponent from '../tabs/library/components/multipage/MultiPageVideosList'

const renderScene = SceneMap({
	favorite: FavoriteFolderListComponent,
	collection: CollectionListComponent,
	multiPart: MultiPageVideosListComponent,
})

const routes = [
	{ key: 'favorite', title: '收藏夹' },
	{ key: 'collection', title: '合集' },
	{ key: 'multiPart', title: '分 p' },
]

export default function TabViewExample() {
	const layout = useWindowDimensions()
	const [index, setIndex] = React.useState(0)
	const insets = useSafeAreaInsets()
	const colors = useTheme().colors

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: colors.background,
				paddingTop: insets.top + 8,
			}}
		>
			<View
				style={{
					paddingBottom: 8,
					flex: 1,
				}}
			>
				<View
					style={{
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
				<TabView
					style={{ flex: 1, backgroundColor: colors.background }}
					navigationState={{ index, routes }}
					renderScene={renderScene}
					renderTabBar={(props) => (
						<TabBar
							{...props}
							style={{
								marginTop: insets.top,
								backgroundColor: colors.secondaryContainer,
							}}
							indicatorStyle={{ backgroundColor: colors.onSecondaryContainer }}
						/>
					)}
					onIndexChange={setIndex}
					initialLayout={{ width: layout.width }}
					options={{
						favorite: {
							icon: ({ focused, size }) => (
								<Icon
									name={
										focused ? 'star-box-multiple' : 'star-box-multiple-outline'
									}
									size={size}
									color={
										focused ? colors.onSecondaryContainer : colors.onSurface
									}
								/>
							),
						},
						collection: {
							icon: ({ focused, size }) => (
								<Icon
									name={focused ? 'folder' : 'folder-outline'}
									size={size}
									color={
										focused ? colors.onSecondaryContainer : colors.onSurface
									}
								/>
							),
						},
						multiPart: {
							icon: ({ focused, size }) => (
								<Icon
									name={focused ? 'folder-play' : 'folder-play-outline'}
									size={size}
									color={
										focused ? colors.onSecondaryContainer : colors.onSurface
									}
								/>
							),
						},
					}}
				/>
			</View>
		</View>
	)
}
