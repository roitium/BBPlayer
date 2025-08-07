import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import { Button, Divider, Text, TouchableRipple } from 'react-native-paper'
import type { IconSource } from 'react-native-paper/lib/typescript/components/Icon'

interface PlaylistHeaderProps {
	coverUri: string | undefined
	title: string | undefined
	subtitles: string | string[] | undefined // 通常格式： "Author • n Tracks"
	description: string | undefined
	onClickMainButton?: () => void
	mainButtonIcon: IconSource
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
}: PlaylistHeaderProps) {
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
					<TouchableRipple onPress={() => setShowFullTitle(!showFullTitle)}>
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
					justifyContent: 'space-between',
					marginHorizontal: 16,
				}}
			>
				{onClickMainButton && (
					<Button
						mode='contained'
						icon={mainButtonIcon}
						onPress={() => onClickMainButton()}
					>
						同步
					</Button>
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
