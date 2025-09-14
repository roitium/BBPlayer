import { getStateFromPath as getStateFromPathDefault } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import {
	ShareIntentModule,
	getScheme,
	getShareExtensionKey,
} from 'expo-share-intent'

export const linking = {
	prefixes: ['bbplayer://', 'trackplayer://'],
	config: {
		screens: {
			Player: 'player',
			MainTabs: {
				path: 'tabs',
				screens: {
					Home: 'home',
					Library: 'library',
					About: 'about',
				},
			},
			PlaylistCollection: 'playlist/collection/:id',
			PlaylistFavorite: 'playlist/favorite/:id',
			PlaylistMultipage: 'playlist/multipage/:bvid',
			PlaylistUploader: 'playlist/uploader/:mid',
			SearchResult: 'search-result/global/:query',
			SearchResultFav: 'search-result/fav/:query',
			Test: 'test',
			NotFound: '*',
		},
	},

	getStateFromPath(
		path: string,
		options: Parameters<typeof getStateFromPathDefault>[1],
	) {
		if (path.startsWith('notification.click')) {
			return { routes: [{ name: 'Player' }] }
		}
		return getStateFromPathDefault(path, options)
	},

	subscribe(listener: (url: string) => void): undefined | void | (() => void) {
		const shareIntentStateSubscription = ShareIntentModule?.addListener(
			'onStateChange',
			(event) => {
				if (event.value === 'pending') {
					listener(`${getScheme()}://tabs/home`)
				}
			},
		)
		return () => {
			// Clean up the event listeners
			shareIntentStateSubscription?.remove()
		}
	},
	// https://reactnavigation.org/docs/deep-linking/#third-party-integrations
	getInitialURL() {
		// REQUIRED FOR ANDROID FIRST LAUNCH
		const needRedirect = ShareIntentModule?.hasShareIntent(
			getShareExtensionKey(),
		)
		if (needRedirect) {
			return `bbplayer://shareintent`
		}
		const url = Linking.getLinkingURL()
		return url
	},
}
