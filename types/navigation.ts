import { Tabs } from '@/app/tabs/library/[tab]'
import type { NavigatorScreenParams } from '@react-navigation/native'

export type BottomTabParamList = {
	Home: undefined
	Search: undefined
	Library: { tab: Tabs } | undefined
	Settings: undefined
}

export type RootStackParamList = {
	MainTabs: NavigatorScreenParams<BottomTabParamList>
	Player: undefined
	Test: undefined
	SearchResult: { query: string }
	NotFound: undefined
	PlaylistCollection: { id: string }
	PlaylistFavorite: { id: string }
	PlaylistMultipage: { bvid: string }
	PlaylistUploader: { mid: string }
	PlaylistLocal: { id: string }
	SearchResultFav: { query: string }
	TestPager: undefined
}
