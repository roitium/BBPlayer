import { formatRelativeTime } from '@/utils/time'
import { Image } from 'expo-image'
import { memo } from 'react'
import { View } from 'react-native'
import { Divider, IconButton, Text } from 'react-native-paper'

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
}: PlaylistHeaderProps) {
	if (!title) return null
	return (
		<View style={{ position: 'relative', flexDirection: 'column' }}>
			{/* 收藏夹信息 */}
			<View style={{ flexDirection: 'row', padding: 16 }}>
				<Image
					source={{ uri: coverUri }}
					contentFit='contain'
					style={{ width: 120, height: 120, borderRadius: 8 }}
				/>
				<View style={{ marginLeft: 16, flex: 1, justifyContent: 'center' }}>
					<Text
						variant='titleLarge'
						style={{ fontWeight: 'bold' }}
						numberOfLines={2}
					>
						{title}
					</Text>
					<Text
						variant='bodyMedium'
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
					justifyContent: 'space-between',
					padding: 16,
				}}
			>
				<Text
					variant='bodyMedium'
					style={{ maxWidth: 300 }}
				>
					{description ?? '还没有简介哦~'}
				</Text>

				<View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
					<IconButton
						mode='contained'
						icon={'sync'}
						size={20}
						onPress={onClickSync}
					/>

					<IconButton
						mode='contained'
						icon={'play'}
						size={30}
						onPress={onClickPlayAll}
					/>
				</View>
			</View>

			<Divider />
		</View>
	)
})
