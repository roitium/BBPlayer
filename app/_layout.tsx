import "react-native-reanimated";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import {
	getStateFromPath as getStateFromPathDefault,
	NavigationContainer,
	useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Sentry from "@sentry/react-native";
import {
	focusManager,
	onlineManager,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import * as Network from "expo-network";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AppState,
	type AppStateStatus,
	InteractionManager,
	Platform,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import GlobalErrorFallback from "@/components/ErrorBoundary";
import { toastConfig } from "@/components/toast/ToastConfig";
import useAppStore from "@/hooks/stores/useAppStore";
import { initPlayer } from "@/lib/player/playerLogic";
import { ApiCallingError } from "@/utils/errors";
import log from "@/utils/log";
import toast from "@/utils/toast";
import type { RootStackParamList } from "../types/navigation";
import NotFoundScreen from "./+not-found";
// Screen imports
import TabLayout from "./(tabs)/_layout";
import PlayerPage from "./player/index";
import PlaylistCollectionPage from "./playlist/collection/[id]";
import PlaylistFavoritePage from "./playlist/favorite/[id]";
import PlaylistMultipagePage from "./playlist/multipage/[bvid]";
import PlaylistUploaderPage from "./playlist/uploader/[mid]";
import SearchResultFavPage from "./search-result/fav/[query]";
import SearchResultsPage from "./search-result/global/[query]";
import TestPage from "./test/index";

const rootLog = log.extend("ROOT");

const manifest = Updates.manifest;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const extra = "extra" in manifest ? manifest.extra : undefined;
const updateGroup =
	metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

const developement = process.env.NODE_ENV === "development";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
	duration: 200,
	fade: true,
});

const navigationIntegration = Sentry.reactNavigationIntegration({
	enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
	dsn: "https://893ea8eb3743da1e065f56b3aa5e96f9@o4508985265618944.ingest.us.sentry.io/4508985267191808",
	debug: false,
	tracesSampleRate: 0.7,
	sendDefaultPii: true,
	integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],
	enableNativeFramesTracking: !isRunningInExpoGo(),
	enabled: !developement,
	environment: developement ? "development" : "production",
});

const scope = Sentry.getGlobalScope();

scope.setTag("expo-update-id", Updates.updateId);
scope.setTag("expo-is-embedded-update", Updates.isEmbeddedLaunch);

if (typeof updateGroup === "string") {
	scope.setTag("expo-update-group-id", updateGroup);

	const owner = extra?.expoClient?.owner ?? "[account]";
	const slug = extra?.expoClient?.slug ?? "[project]";
	scope.setTag(
		"expo-update-debug-url",
		`https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
	);
} else if (Updates.isEmbeddedLaunch) {
	scope.setTag("expo-update-debug-url", "not applicable for embedded updates");
}

// 设置全局错误处理器，捕获未被处理的 JS 错误
if (!developement) {
	// biome-ignore lint/suspicious/noExplicitAny: 无需解释
	const errorUtils = (global as any).ErrorUtils;
	if (errorUtils) {
		const originalErrorHandler = errorUtils.getGlobalHandler();

		errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
			Sentry.captureException(error, {
				tags: {
					scope: "GlobalErrorHandler",
					isFatal: String(isFatal),
				},
			});

			originalErrorHandler(error, isFatal);
		});
	}
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			refetchOnWindowFocus: true,
			refetchOnMount: true,
			refetchOnReconnect: true,
			refetchInterval: false,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(`请求 ${query.queryKey} 失败`, {
				description: error.message,
				duration: Number.POSITIVE_INFINITY,
			});
			rootLog.error(`请求 ${query.queryKey} 失败`, error);

			// 这个错误属于三方依赖的错误，不应该报告到 Sentry
			if (error instanceof ApiCallingError) {
				return;
			}

			Sentry.captureException(error, {
				tags: {
					scope: "QueryCache",
					queryKey: JSON.stringify(query.queryKey),
				},
				extra: {
					queryHash: query.queryHash,
					retry: query.options.retry,
				},
			});
		},
	}),
});

const RootStack = createNativeStackNavigator<RootStackParamList>();

const linking = {
	prefixes: ["bbplayer://", "trackplayer://"],
	config: {
		screens: {
			Player: "player",
			MainTabs: {
				path: "tabs",
				screens: {
					Home: "home",
					Search: "search",
					Library: "library",
					About: "about",
				},
			},
			PlaylistCollection: "playlist/collection/:id",
			PlaylistFavorite: "playlist/favorite/:id",
			PlaylistMultipage: "playlist/multipage/:bvid",
			PlaylistUploader: "playlist/uploader/:mid",
			SearchResult: "search-result/global/:query",
			SearchResultFav: "search-result/fav/:query",
			Test: "test",
			NotFound: "*",
		},
	},
	// biome-ignore lint/suspicious/noExplicitAny: fuck off
	getStateFromPath(path: string, options: any) {
		console.log(path);
		if (path.startsWith("notification.click")) {
			return { routes: [{ name: "Player" }] };
		}
		return getStateFromPathDefault(path, options);
	},
};

function onAppStateChange(status: AppStateStatus) {
	if (Platform.OS !== "web") {
		focusManager.setFocused(status === "active");
	}
}

export default Sentry.wrap(function RootLayout() {
	const ref = useNavigationContainerRef();
	const [appIsReady, setAppIsReady] = useState(false);

	const colorScheme = useColorScheme();
	const { theme } = useMaterial3Theme();
	const paperTheme = useMemo(
		() =>
			colorScheme === "dark"
				? { ...MD3DarkTheme, colors: theme.dark }
				: { ...MD3LightTheme, colors: theme.light },
		[colorScheme, theme],
	);
	useEffect(() => {
		onlineManager.setEventListener((setOnline) => {
			const eventSubscription = Network.addNetworkStateListener((state) => {
				setOnline(!!state.isConnected);
			});
			return eventSubscription.remove;
		});
	}, []);

	useEffect(() => {
		if (ref?.current) {
			navigationIntegration.registerNavigationContainer(ref);
		}
	}, [ref]);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", onAppStateChange);

		return () => subscription.remove();
	}, []);

	useEffect(() => {
		async function prepare() {
			try {
				useAppStore.getState();
			} catch (error) {
				console.error("Initial preparation error:", error);
				Sentry.captureException(error, { tags: { scope: "PrepareFunction" } });
			} finally {
				setAppIsReady(true);
			}
		}

		prepare().catch((error) => {
			console.error("Initial preparation error:", error);
			Sentry.captureException(error, { tags: { scope: "PrepareFunction" } });
		});
	}, []);

	useEffect(() => {
		if (developement) {
			return;
		}
		const update = () => {
			toast.loading("正在下载更新包", { id: "update" });
			Updates.fetchUpdateAsync()
				.then(() => {
					toast.success("更新包下载完成，重载应用", { id: "update" });
				})
				.then(() => {
					Updates.reloadAsync();
				})
				.catch((error) => {
					console.error("更新包下载失败", error);
					toast.error("更新包下载失败", {
						description: error.message,
						id: "update",
						duration: Number.POSITIVE_INFINITY,
					});
				});
		};
		Updates.checkForUpdateAsync()
			.then((result) => {
				if (result.isAvailable) {
					toast.show("检测到有新的热更新，是否更新？", {
						action: { label: "更新", onClick: update },
						duration: Number.POSITIVE_INFINITY,
						id: "update",
					});
				}
			})
			.catch((error) => {
				console.error("检测更新失败", error);
				toast.error("检测更新失败", {
					description: error.message,
					duration: Number.POSITIVE_INFINITY,
				});
			});
	}, []);

	// 异步初始化播放器 (在 appIsReady 后执行)
	useEffect(() => {
		if (appIsReady) {
			const initializePlayer = async () => {
				if (!global.playerIsReady) {
					try {
						await initPlayer();
						console.log("Deferred player setup complete.");
					} catch (error) {
						console.error("Deferred player setup failed:", error);
						Sentry.captureException(error, {
							tags: { scope: "DeferredPlayerSetup" },
						});
						global.playerIsReady = false;
					}
				}
			};

			InteractionManager.runAfterInteractions(() =>
				Sentry.startSpan({ name: "initializePlayer" }, initializePlayer),
			);
		}
	}, [appIsReady]);

	const onLayoutRootView = useCallback(() => {
		if (appIsReady) {
			SplashScreen.hide();
		}
	}, [appIsReady]);

	if (!appIsReady) {
		return null;
	}

	return (
		<>
			<SafeAreaProvider>
				<View onLayout={onLayoutRootView} style={{ flex: 1 }}>
					<Sentry.ErrorBoundary
						fallback={({ error, resetError }) => (
							<GlobalErrorFallback error={error} resetError={resetError} />
						)}
					>
						<GestureHandlerRootView>
							<QueryClientProvider client={queryClient}>
								<PaperProvider theme={paperTheme}>
									<NavigationContainer
										ref={ref}
										linking={linking}
										fallback={<Text>Loading...</Text>}
									>
										<RootStack.Navigator
											initialRouteName="MainTabs"
											screenOptions={{ headerShown: false }}
										>
											<RootStack.Screen name="MainTabs" component={TabLayout} />
											<RootStack.Screen
												name="Player"
												component={PlayerPage}
												options={{
													animation: "slide_from_bottom",
													animationDuration: 200,
												}}
											/>
											<RootStack.Screen name="Test" component={TestPage} />
											<RootStack.Screen
												name="SearchResult"
												component={SearchResultsPage}
											/>
											<RootStack.Screen
												name="NotFound"
												component={NotFoundScreen}
											/>
											<RootStack.Screen
												name="PlaylistCollection"
												component={PlaylistCollectionPage}
											/>
											<RootStack.Screen
												name="PlaylistFavorite"
												component={PlaylistFavoritePage}
											/>
											<RootStack.Screen
												name="PlaylistMultipage"
												component={PlaylistMultipagePage}
											/>
											<RootStack.Screen
												name="PlaylistUploader"
												component={PlaylistUploaderPage}
											/>
											<RootStack.Screen
												name="SearchResultFav"
												component={SearchResultFavPage}
											/>
										</RootStack.Navigator>
									</NavigationContainer>
								</PaperProvider>
							</QueryClientProvider>
						</GestureHandlerRootView>
					</Sentry.ErrorBoundary>
					<SystemBars style="auto" />
				</View>
			</SafeAreaProvider>
			<Toast config={toastConfig} />
		</>
	);
});
