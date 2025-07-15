import { getStateFromPath as getStateFromPathDefault } from '@react-navigation/native'

export const linking = {
	prefixes: ['bbplayer://', 'trackplayer://'],
	config: {
		screens: {
			Player: 'player',
			MainTabs: {
				path: 'tabs',
				screens: {
					Home: 'home',
					Search: 'search',
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getStateFromPath(path: string, options: any) {
		console.log(path)
		if (path.startsWith('notification.click')) {
			return { routes: [{ name: 'Player' }] }
		}
		return getStateFromPathDefault(path, options)
	},
}
