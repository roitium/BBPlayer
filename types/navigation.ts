import type { Tabs } from '@/app/tabs/library/[tab]'
import type { NavigatorScreenParams } from '@react-navigation/native'

export interface BottomTabParamList {
	Home: undefined
	Search: undefined
	Library: { tab: Tabs } | undefined
	Settings: undefined
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- react navigation 指明了 RootStackParamList 必须使用 type alias
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
