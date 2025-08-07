import { formatRelativeTime } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import { Divider, IconButton, Text, TouchableRipple } from 'react-native-paper'

interface PlaylistHeaderProps {
	coverUri?: string
	title: string
	description?: string
	onClickPlayAll: () => void
	onClickSync: () => void
	lastSyncedAt?: Date
	authorName?: string
	trackCount: number
	validTrackCount: number
	onClickCopyToLocalPlaylist: () => void
}

/**
 * 播放列表头部组件。
 */
export const PlaylistHeader = memo(function PlaylistHeader({
	coverUri,
	title,
	description,
	lastSyncedAt,
	authorName,
	trackCount,
	validTrackCount,
	onClickPlayAll,
	onClickSync,
	onClickCopyToLocalPlaylist,
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
				<View
					style={{
						marginLeft: 16,
						flex: 1,
						justifyContent: 'center',
						marginVertical: 8,
					}}
				>
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
						style={{ fontWeight: '100' }}
						numberOfLines={2}
					>
						{authorName} • {trackCount}
						{validTrackCount !== trackCount ? `(${validTrackCount})` : ''}{' '}
						首歌曲
						{'\n'}
						{'最后同步：'}
						{lastSyncedAt ? formatRelativeTime(lastSyncedAt) : '未知'}
					</Text>
				</View>
			</View>

			{/* 描述和操作按钮 */}
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'flex-start',
					marginHorizontal: 16,
				}}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<IconButton
						mode='contained'
						icon={'play'}
						size={30}
						onPress={onClickPlayAll}
					/>
					<IconButton
						mode='contained'
						icon={'sync'}
						size={20}
						onPress={onClickSync}
					/>
					<IconButton
						mode='contained'
						icon={'copy'}
						size={20}
						onPress={onClickCopyToLocalPlaylist}
					/>
				</View>
			</View>

			<Text variant='bodyMedium'>{description ?? '还没有简介哦~'}</Text>

			<Divider />
		</View>
	)
})
