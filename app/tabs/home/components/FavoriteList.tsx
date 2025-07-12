import { useGetFavoritePlaylists } from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { RootStackParamList } from '@/types/navigation'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import PlaylistItem from './PlaylistItem'

export default function FavoriteList() {
	const { colors } = useTheme()
	const { data: personalInfo } = usePersonalInformation()
	const {
		data: playlists,
		isPending: playlistsPending,
		isError: playlistsError,
	} = useGetFavoritePlaylists(personalInfo?.mid)

	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	const handleViewAll = () => {
		navigation.navigate('MainTabs', { screen: 'Library' })
	}

	const filteredData = playlists?.filter(
		(item) => !item.title.startsWith('[mp]'),
	)

	return (
		<>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingHorizontal: 16,
				}}
			>
				<Text
					variant='titleLarge'
					style={{ fontWeight: 'bold' }}
				>
					收藏夹
				</Text>
				<TouchableOpacity onPress={handleViewAll}>
					<Text
						variant='labelLarge'
						style={{ color: colors.primary }}
					>
						查看全部
					</Text>
				</TouchableOpacity>
			</View>
			{playlistsPending ? (
				<ActivityIndicator style={{ marginTop: 10, marginBottom: 10 }} />
			) : playlistsError ? (
				<Text
					style={{ textAlign: 'center', color: 'red', paddingHorizontal: 16 }}
				>
					加载收藏夹失败
				</Text>
			) : !playlists || playlists.length === 0 ? (
				<Text
					style={{ textAlign: 'center', color: 'grey', paddingHorizontal: 16 }}
				>
					暂无收藏夹
				</Text>
			) : (
				<ScrollView
					horizontal
					contentInsetAdjustmentBehavior='automatic'
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
				>
					{filteredData?.map((item) => (
						<PlaylistItem
							key={item.id.toString()}
							item={item}
						/>
					))}
				</ScrollView>
			)}
		</>
	)
}
