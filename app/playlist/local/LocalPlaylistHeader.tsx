import type { Playlist } from '@/types/core/media'
import { formatRelativeTime } from '@/utils/time'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import {
	Button,
	Divider,
	IconButton,
	Text,
	Tooltip,
	TouchableRipple,
} from 'react-native-paper'

interface PlaylistHeaderProps {
	playlist: Playlist
	onClickPlayAll: () => void
	onClickSync: () => void
	validTrackCount: number
	onClickCopyToLocalPlaylist: () => void
}

/**
 * 播放列表头部组件。
 */
export const PlaylistHeader = memo(function PlaylistHeader({
	playlist,
	validTrackCount,
	onClickPlayAll,
	onClickSync,
	onClickCopyToLocalPlaylist,
}: PlaylistHeaderProps) {
	const [showFullTitle, setShowFullTitle] = useState(false)

	if (!playlist.title) return null
	return (
		<View style={{ position: 'relative', flexDirection: 'column' }}>
			{/* 收藏夹信息 */}
			<View style={{ flexDirection: 'row', margin: 16, alignItems: 'center' }}>
				<Image
					source={{ uri: playlist.coverUrl ?? undefined }}
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
							{playlist.title}
						</Text>
					</TouchableRipple>

					<Text
						variant='bodyMedium'
						style={{ fontWeight: '100' }}
						numberOfLines={2}
					>
						{playlist.author?.name} • {playlist.itemCount}
						{validTrackCount !== playlist.itemCount
							? `(${validTrackCount})`
							: ''}{' '}
						首歌曲
						{playlist.type !== 'local' &&
							'\n' +
								'最后同步：' +
								(playlist.lastSyncedAt
									? formatRelativeTime(playlist.lastSyncedAt)
									: '未知')}
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
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Button
						mode='contained'
						icon={'play'}
						onPress={onClickPlayAll}
					>
						播放全部
					</Button>
					{playlist.type === 'local' || (
						<IconButton
							mode='contained'
							icon={'sync'}
							size={20}
							onPress={onClickSync}
						/>
					)}
					<Tooltip title='复制到本地歌单'>
						<IconButton
							mode='contained'
							icon='content-copy'
							size={20}
							onPress={onClickCopyToLocalPlaylist}
						/>
					</Tooltip>
				</View>
			</View>

			<Text
				style={{
					margin: playlist.description ? 16 : 0,
				}}
				variant='bodyMedium'
			>
				{playlist.description ?? ''}
			</Text>

			<Divider />
		</View>
	)
})
