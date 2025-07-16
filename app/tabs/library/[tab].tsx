import useResetScreenOnBlur from '@/hooks/utils/useResetScreenOnBlur'
import { BottomTabParamList } from '@/types/navigation'
import Icon from '@react-native-vector-icons/material-design-icons'
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native'
import { useState } from 'react'
import { Dimensions, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SceneMap, TabBar, TabView } from 'react-native-tab-view'
import CollectionListComponent from './components/collection/CollectionList'
import FavoriteFolderListComponent from './components/favorite/FavoriteFolderList'
import MultiPageVideosListComponent from './components/multipage/MultiPageVideosList'

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

export enum Tabs {
	Collection = 1,
	Favorite = 0,
	MultiPart = 2,
}

export default function Library() {
	const [index, setIndex] = useState(Tabs.Favorite)
	const insets = useSafeAreaInsets()
	const colors = useTheme().colors
	const router = useRoute<RouteProp<BottomTabParamList, 'Library'>>()
	const tab = router.params?.tab

	useFocusEffect(() => {
		if (tab === undefined) return
		setIndex(tab)
	})
	useResetScreenOnBlur()

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
						marginHorizontal: 16,
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
					overScrollMode={'never'}
					renderTabBar={(props) => (
						<TabBar
							{...props}
							style={{
								backgroundColor: colors.background,
								overflow: 'hidden',
								justifyContent: 'center',
								maxHeight: 70,
								marginBottom: 20,
								marginTop: 20,
								elevation: 0,
							}}
							indicatorStyle={{ backgroundColor: colors.onSecondaryContainer }}
							activeColor={colors.onSecondaryContainer}
							inactiveColor={colors.onSurface}
						/>
					)}
					onIndexChange={setIndex}
					initialLayout={{ width: Dimensions.get('window').width, height: 0 }}
					options={{
						favorite: {
							icon: ({ focused }) => (
								<Icon
									name={
										focused ? 'star-box-multiple' : 'star-box-multiple-outline'
									}
									size={20}
									color={
										focused ? colors.onSecondaryContainer : colors.onSurface
									}
								/>
							),
						},
						collection: {
							icon: ({ focused }) => (
								<Icon
									name={focused ? 'folder' : 'folder-outline'}
									size={20}
									color={
										focused ? colors.onSecondaryContainer : colors.onSurface
									}
								/>
							),
						},
						multiPart: {
							icon: ({ focused }) => (
								<Icon
									name={focused ? 'folder-play' : 'folder-play-outline'}
									size={20}
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
