import ModalHost from '@/components/ModalHost'
import NowPlayingBar from '@/components/NowPlayingBar'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View } from 'react-native'
import type { RootStackParamList } from '../types/navigation'
import NotFoundScreen from './not-found'
import PlayerPage from './player/player'
import LocalPlaylistPage from './playlist/local/[id]'
import PlaylistCollectionPage from './playlist/remote/collection/[id]'
import PlaylistFavoritePage from './playlist/remote/favorite/[id]'
import PlaylistMultipagePage from './playlist/remote/multipage/[bvid]'
import SearchResultFavPage from './playlist/remote/search-result/fav/[query]'
import SearchResultsPage from './playlist/remote/search-result/global/[query]'
import PlaylistUploaderPage from './playlist/remote/uploader/[mid]'
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
				<RootStack.Screen
					name='NotFound'
					component={NotFoundScreen}
				/>
				<RootStack.Screen
					name='ModalHost'
					component={ModalHost}
					options={{
						presentation: 'transparentModal',
						gestureEnabled: false,
						animation: 'fade',
					}}
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
