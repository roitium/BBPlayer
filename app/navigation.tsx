import NowPlayingBar from '@/components/NowPlayingBar'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View } from 'react-native'
import type { RootStackParamList } from '../types/navigation'
import NotFoundScreen from './not-found'
import PlayerPage from './player/player'
import PlaylistCollectionPage from './playlist/collection/[id]'
import PlaylistFavoritePage from './playlist/favorite/[id]'
import LocalPlaylistPage from './playlist/local/[id]'
import PlaylistMultipagePage from './playlist/multipage/[bvid]'
import PlaylistUploaderPage from './playlist/uploader/[mid]'
import SearchResultFavPage from './search-result/fav/[query]'
import SearchResultsPage from './search-result/global/[query]'
import TabLayout from './tabs/layout'
import TestPage from './test/test'

export const RootStack = createNativeStackNavigator<RootStackParamList>()

export function RootLayoutNav() {
	return (
		<View style={{ flex: 1 }}>
			<RootStack.Navigator
				initialRouteName='MainTabs'
				screenOptions={{ headerShown: false }}
			>
				<RootStack.Screen
					name='MainTabs'
					component={TabLayout}
				/>
				<RootStack.Screen
					name='Player'
					component={PlayerPage}
					options={{
						animation: 'slide_from_bottom',
					}}
				/>
				<RootStack.Screen
					name='Test'
					component={TestPage}
				/>
				<RootStack.Screen
					name='SearchResult'
					component={SearchResultsPage}
				/>
				<RootStack.Screen
					name='NotFound'
					component={NotFoundScreen}
				/>
				<RootStack.Screen
					name='PlaylistCollection'
					component={PlaylistCollectionPage}
				/>
				<RootStack.Screen
					name='PlaylistFavorite'
					component={PlaylistFavoritePage}
				/>
				<RootStack.Screen
					name='PlaylistMultipage'
					component={PlaylistMultipagePage}
				/>
				<RootStack.Screen
					name='PlaylistUploader'
					component={PlaylistUploaderPage}
				/>
				<RootStack.Screen
					name='SearchResultFav'
					component={SearchResultFavPage}
				/>
				<RootStack.Screen
					name='PlaylistLocal'
					component={LocalPlaylistPage}
				/>
			</RootStack.Navigator>
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}
