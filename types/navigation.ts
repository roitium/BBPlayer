import type { NavigatorScreenParams } from '@react-navigation/native';

// Parameter list for the Bottom Tab Navigator (app/(tabs)/_layout.tsx)
export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  About: undefined;
};

// Parameter list for the Root Stack Navigator (app/_layout.tsx)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>; // For navigating to a screen within the tab navigator
  Player: undefined;
  Test: undefined;
  SearchResult: { query: string };
  NotFound: undefined;
  PlaylistCollection: { id: string };
  PlaylistFavorite: { id: string };
  PlaylistMultipage: { bvid: string };
  PlaylistUploader: { mid: string };
  SearchResultFav: { query: string };
  // Add other root stack screens here if any
};

// It's also good practice to declare types for composite navigation props
// if you have complex navigation scenarios, but we'll start with these.
// For example:
// export type HomeScreenNavigationProp = CompositeNavigationProp<
//   BottomTabNavigationProp<BottomTabParamList, 'Home'>,
//   NativeStackNavigationProp<RootStackParamList>
// >;
