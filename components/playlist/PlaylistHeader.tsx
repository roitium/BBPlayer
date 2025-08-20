import type { RootStackParamList } from '@/types/navigation'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Clipboard from 'expo-clipboard'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import {
	Button,
	Divider,
	IconButton,
	Text,
	TouchableRipple,
} from 'react-native-paper'
import type { IconSource } from 'react-native-paper/lib/typescript/components/Icon'

interface PlaylistHeaderProps {
	coverUri: string | undefined
	title: string | undefined
	subtitles: string | string[] | undefined // 通常格式： "Author • n Tracks"
	description: string | undefined
	onClickMainButton?: () => void
	mainButtonIcon: IconSource
	linkedPlaylistId?: number
}

/**
 * 可复用的播放列表头部组件。
 */
export const PlaylistHeader = memo(function PlaylistHeader({
	coverUri,
	title,
	subtitles,
	description,
	onClickMainButton,
	mainButtonIcon,
	linkedPlaylistId,
}: PlaylistHeaderProps) {
	const navigation = useNavigation<
		NativeStackNavigationProp<RootStackParamList, 'PlaylistMultipage'> // 这里的泛型参数随便写一个好了
	>()
	const [showFullTitle, setShowFullTitle] = useState(false)
	if (!title) return null

	return (
		<View style={{ position: 'relative', flexDirection: 'column' }}>
			{/* 收藏夹信息 */}
			<View style={{ flexDirection: 'row', padding: 16, alignItems: 'center' }}>
				<Image
					source={{ uri: coverUri }}
					contentFit='cover'
					style={{ width: 120, height: 120, borderRadius: 8 }}
				/>
				<View style={{ marginLeft: 16, flex: 1, justifyContent: 'center' }}>
					<TouchableRipple
						onPress={() => setShowFullTitle(!showFullTitle)}
						onLongPress={async () => {
							const result = await Clipboard.setStringAsync(title)
							if (!result) {
								toast.error('复制失败')
							} else {
								toast.success('已复制标题到剪贴板')
							}
						}}
					>
						<Text
							variant='titleLarge'
							style={{ fontWeight: 'bold' }}
							numberOfLines={showFullTitle ? undefined : 2}
						>
							{title}
						</Text>
					</TouchableRipple>
					<Text
						variant='bodyMedium'
						numberOfLines={Array.isArray(subtitles) ? subtitles.length : 1}
					>
						{Array.isArray(subtitles) ? subtitles.join('\n') : subtitles}
					</Text>
				</View>
			</View>

			{/* 操作按钮 */}
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'flex-start',
					marginHorizontal: 16,
				}}
			>
				{onClickMainButton && (
					<Button
						mode='contained'
						icon={mainButtonIcon}
						onPress={() => onClickMainButton()}
					>
						{linkedPlaylistId ? '重新同步' : '同步到本地'}
					</Button>
				)}
				{linkedPlaylistId && (
					<IconButton
						mode='contained'
						icon={'arrow-right'}
						size={20}
						onPress={() =>
							navigation.navigate('PlaylistLocal', {
								id: linkedPlaylistId.toString(),
							})
						}
					/>
				)}
			</View>

			<Text
				variant='bodyMedium'
				style={{ margin: description ? 16 : 0 }}
			>
				{description ?? ''}
			</Text>

			<Divider />
		</View>
	)
})
