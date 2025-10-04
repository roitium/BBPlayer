import { alert } from '@/components/modals/AlertModal'
import useDownloadManagerStore from '@/hooks/stores/useDownloadManagerStore'
import { useModalStore } from '@/hooks/stores/useModalStore'
import type { Playlist, Track } from '@/types/core/media'
import { formatRelativeTime } from '@/utils/time'
import toast from '@/utils/toast'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import { Image } from 'expo-image'
import { memo, useCallback, useMemo, useState } from 'react'
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
	playlistContents: Track[]
	onClickPlayAll: () => void
	onClickSync: () => void
	validTrackCount: number
	onClickCopyToLocalPlaylist: () => void
	/** 当作者为 bilibili 时触发。可选，未提供时仅视觉提示不响应 */
	onPressAuthor?: (author: NonNullable<Playlist['author']>) => void
}

interface SubtitlePieces {
	isLocal: boolean
	authorName?: string
	authorClickable: boolean
	countText: string
	syncLine?: string // 带“最后同步：xxx”的整行
}

// 三元运算符过于难懂，还是用函数好一些
function buildSubtitlePieces(
	playlist: Playlist,
	validTrackCount: number,
): SubtitlePieces {
	const isLocal = playlist.type === 'local'

	const countRaw =
		validTrackCount !== playlist.itemCount
			? `${playlist.itemCount}(${validTrackCount})`
			: `${playlist.itemCount}`

	const countText = `${countRaw} 首歌曲`

	const authorName = !isLocal
		? (playlist.author?.name ?? '未知作者')
		: undefined
	const authorClickable =
		!!authorName && !isLocal && playlist.author?.source === 'bilibili'

	const syncLine = !isLocal
		? `最后同步：${
				playlist.lastSyncedAt
					? formatRelativeTime(playlist.lastSyncedAt)
					: '未知'
			}`
		: undefined

	return { isLocal, authorName, authorClickable, countText, syncLine }
}

/**
 * 播放列表头部组件。
 */
export const PlaylistHeader = memo(function PlaylistHeader({
	playlist,
	validTrackCount,
	playlistContents,
	onClickPlayAll,
	onClickSync,
	onClickCopyToLocalPlaylist,
	onPressAuthor,
}: PlaylistHeaderProps) {
	const [showFullTitle, setShowFullTitle] = useState(false)
	const queueDownloads = useDownloadManagerStore(
		(state) => state.queueDownloads,
	)
	const navigation = useNavigation()

	const { isLocal, authorName, authorClickable, countText, syncLine } = useMemo(
		() => buildSubtitlePieces(playlist, validTrackCount),
		[playlist, validTrackCount],
	)
	const onClickDownloadAll = useCallback(() => {
		if (!playlistContents) return
		queueDownloads(
			playlistContents
				.filter((t) => t.trackDownloads?.status !== 'downloaded')
				.map((t) => ({
					uniqueKey: t.uniqueKey,
					title: t.title,
					coverUrl: t.coverUrl ?? undefined,
				})),
		)
		useModalStore.getState().doAfterModalHostClosed(() => {
			navigation.navigate('Download')
		})
	}, [navigation, playlistContents, queueDownloads])

	if (!playlist.title) return null

	return (
		<View style={{ position: 'relative', flexDirection: 'column' }}>
			{/* 顶部信息 */}
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
					<TouchableRipple
						onPress={() => setShowFullTitle(!showFullTitle)}
						onLongPress={async () => {
							const result = await Clipboard.setStringAsync(playlist.title)
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
							{playlist.title}
						</Text>
					</TouchableRipple>

					<Text
						variant='bodyMedium'
						style={{ fontWeight: '100' }}
						numberOfLines={2}
					>
						{isLocal ? (
							<>{countText}</>
						) : (
							<>
								{/* 作者名 */}
								<Text
									variant='bodyMedium'
									onPress={
										authorClickable && playlist.author
											? () => onPressAuthor?.(playlist.author!)
											: undefined
									}
									style={{
										textDecorationLine: authorClickable ? 'underline' : 'none',
									}}
								>
									{authorName}
								</Text>
								{' • '}
								{countText}
								{syncLine ? '\n' : ''}
								{syncLine}
							</>
						)}
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
					marginBottom: playlist.description ? 0 : 16,
				}}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Button
						mode='contained'
						icon='play'
						onPress={onClickPlayAll}
					>
						播放全部
					</Button>

					{playlist.type !== 'local' && (
						<IconButton
							mode='contained'
							icon='sync'
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
					<Tooltip title='下载全部'>
						<IconButton
							mode='contained'
							icon='download'
							size={20}
							onPress={() =>
								alert(
									'下载全部？',
									'是否要下载该播放列表内的全部歌曲？（已下载过的不会重新下载）',
									[
										{
											text: '取消',
										},
										{
											text: '确定',
											onPress: onClickDownloadAll,
										},
									],
									{ cancelable: true },
								)
							}
						/>
					</Tooltip>
				</View>
			</View>

			{/* 描述 */}
			{!!playlist.description && (
				<Text
					style={{ margin: 16 }}
					variant='bodyMedium'
				>
					{playlist.description}
				</Text>
			)}

			<Divider />
		</View>
	)
})
