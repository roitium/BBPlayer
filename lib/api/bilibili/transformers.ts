import type {
	BilibiliFavoriteListContent,
	BilibiliHistoryVideo,
	BilibiliHotSearch,
	BilibiliMultipageVideo,
	BilibiliPlaylist,
	BilibiliSearchVideo,
	BilibiliUserUploadedVideosResponse,
	BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import type { Artist, BilibiliTrack, Playlist, Track } from '@/types/core/media'
import log from '@/utils/log'
import { formatMMSSToSeconds } from '@/utils/time'

const bilibiliApiLog = log.extend('BILIBILI_API/TRANS')
const PLACEHOLDER_NUM = 0

/**
 * 将B站历史记录视频列表转换为内部 Track 格式
 */
export const transformHistoryVideosToTracks = (
	videos: BilibiliHistoryVideo[],
): Track[] => {
	try {
		return videos.map(
			(video): BilibiliTrack => ({
				id: PLACEHOLDER_NUM,
				title: video.title,
				artist: {
					id: PLACEHOLDER_NUM,
					name: video.owner.name,
					remoteId: video.owner.mid.toString(),
					source: 'bilibili',
					avatarUrl: video.owner.face,
					signature: null,
					createdAt: PLACEHOLDER_NUM,
				},
				coverUrl: video.pic,
				source: 'bilibili',
				duration: video.duration,
				createdAt: PLACEHOLDER_NUM,
				playCountSequence: [],
				bilibiliMetadata: {
					bvid: video.bvid,
					isMultiPage: false,
					createAt: video.pubdate,
					cid: null,
				},
			}),
		)
	} catch (error) {
		bilibiliApiLog.error('转换历史记录视频失败:', error)
		return []
	}
}

/**
 * 将B站视频详细信息转换为内部 Track 格式
 */
export const transformVideoDetailsToTrack = (
	video: BilibiliVideoDetails,
): BilibiliTrack => {
	return {
		id: 0, // 占位符
		title: video.title,
		artist: {
			id: 0, // 占位符
			name: video.owner.name,
			remoteId: video.owner.mid.toString(),
			source: 'bilibili',
			avatarUrl: video.owner.face,
			signature: video.desc,
			createdAt: 0, // 占位符
		},
		coverUrl: video.pic,
		source: 'bilibili',
		duration: Number(video.duration),
		createdAt: 0, // 占位符
		playCountSequence: [],
		bilibiliMetadata: {
			bvid: video.bvid,
			isMultiPage: video.pages.length > 1,
			createAt: video.pubdate * 1000,
			cid: video.cid,
		},
	}
}

/**
 * 将B站收藏夹列表转换为内部 Playlist 格式
 */
export const transformFavoriteListsToPlaylists = (
	lists: BilibiliPlaylist[] | null,
): Playlist[] => {
	if (!lists) return []
	try {
		return lists.map(
			(list): Playlist => ({
				id: 0, // 占位符
				title: list.title,
				author: {
					id: 0, // 占位符
					name: list.upper.name,
					remoteId: list.upper.mid.toString(),
					source: 'bilibili',
					avatarUrl: list.upper.face,
					signature: null, // 列表API不提供
					createdAt: 0, // 占位符
				},
				description: list.intro,
				coverUrl: list.cover, // B站收藏夹有封面
				itemCount: list.media_count,
				type: 'favorite',
				remoteSyncId: list.id,
				lastSyncedAt: null, // 此刻未知
				createdAt: 0, // 占位符
				// contents 字段在此处不填充
			}),
		)
	} catch (error) {
		bilibiliApiLog.error('转换收藏夹列表失败:', error)
		return []
	}
}

/**
 * 将B站搜索结果视频列表转换为内部 Track 格式
 */
export const transformSearchResultsToTracks = (
	videos: BilibiliSearchVideo[],
): Track[] => {
	if (!videos) return []
	try {
		return videos
			.filter((video) => video.bvid)
			.map(
				(video): BilibiliTrack => ({
					id: 0,
					title: video.title.replace(/<em[^>]*>|<\/em>/g, ''),
					artist: {
						id: 0,
						name: video.author,
						remoteId: video.mid.toString(),
						source: 'bilibili',
						avatarUrl: null, // 搜索结果不提供
						signature: null,
						createdAt: 0,
					},
					coverUrl: `https:${video.pic}`,
					source: 'bilibili',
					duration: formatMMSSToSeconds(video.duration),
					createdAt: 0,
					playCountSequence: [],
					bilibiliMetadata: {
						bvid: video.bvid,
						isMultiPage: false, // 搜索结果不提供
						createAt: video.senddate * 1000,
						cid: null, // 搜索结果不提供
					},
				}),
			)
	} catch (error) {
		bilibiliApiLog.error('转换搜索结果失败:', error)
		return []
	}
}

/**
 * 将B站收藏夹内容列表转换为内部 Track 格式
 */
export const transformFavoriteContentsToTracks = (
	contents: BilibiliFavoriteListContent[] | null,
): Track[] => {
	if (!contents) return []
	try {
		return contents
			.filter((content) => content.type === 2 && content.attr === 0)
			.map(
				(content): BilibiliTrack => ({
					id: 0,
					title: content.title,
					artist: {
						id: 0,
						name: content.upper.name,
						remoteId: content.upper.mid.toString(),
						source: 'bilibili',
						avatarUrl: content.upper.face,
						signature: null,
						createdAt: 0,
					},
					coverUrl: content.cover,
					source: 'bilibili',
					duration: content.duration,
					createdAt: 0,
					playCountSequence: [],
					bilibiliMetadata: {
						bvid: content.bvid,
						isMultiPage: content.page > 1,
						createAt: content.pubdate * 1000,
						cid: content.cid,
					},
				}),
			)
	} catch (error) {
		bilibiliApiLog.error('转换收藏夹内容失败:', error)
		return []
	}
}

/**
 * 将B站分 p 视频数据转换为内部 Track 格式
 */
export const transformMultipageVideosToTracks = (
	pages: BilibiliMultipageVideo[],
	mainVideo: BilibiliVideoDetails,
): Track[] => {
	if (!pages) return []
	// 先创建一次作者对象，避免在 map 中重复创建
	const artist: Artist = {
		id: 0,
		name: mainVideo.owner.name,
		remoteId: mainVideo.owner.mid.toString(),
		source: 'bilibili',
		avatarUrl: mainVideo.owner.face,
		signature: mainVideo.desc,
		createdAt: 0,
	}
	try {
		return pages.map(
			(page): BilibiliTrack => ({
				id: 0,
				title: page.part, // 分P标题
				artist: artist, // 复用同一个 Artist 对象
				coverUrl: mainVideo.pic, // 使用主视频封面
				source: 'bilibili',
				duration: page.duration,
				createdAt: 0,
				playCountSequence: [],
				bilibiliMetadata: {
					bvid: mainVideo.bvid, // 使用主视频 bvid
					isMultiPage: true,
					createAt: mainVideo.pubdate * 1000,
					cid: page.cid, // 每个分P独立的 cid
				},
			}),
		)
	} catch (error) {
		bilibiliApiLog.error('转换分P视频失败:', error)
		return []
	}
}

/**
 * 将用户上传的视频列表转换为内部 Track 格式
 */
export const transformUserUploadedVideosToTracks = (
	videos: BilibiliUserUploadedVideosResponse['list']['vlist'],
): Track[] => {
	if (!videos) return []
	try {
		return videos.map(
			(video): BilibiliTrack => ({
				id: 0,
				title: video.title,
				artist: {
					id: 0,
					name: video.author,
					// 此API不提供mid，这是一个数据缺陷
					remoteId: null,
					source: 'bilibili',
					avatarUrl: null,
					signature: null,
					createdAt: 0,
				},
				coverUrl: video.pic,
				source: 'bilibili',
				duration: formatMMSSToSeconds(video.length),
				createdAt: 0,
				playCountSequence: [],
				bilibiliMetadata: {
					bvid: video.bvid,
					isMultiPage: false,
					createAt: video.created * 1000,
					cid: null,
				},
			}),
		)
	} catch (error) {
		bilibiliApiLog.error('转换用户上传视频失败:', error)
		return []
	}
}

// ... 其他与核心模型无关的转换函数可以保持原样 ...
/**
 * 将B站热门搜索关键词列表转换为通用格式
 */
export const transformHotSearches = (
	hotSearches: BilibiliHotSearch[],
): { id: string; text: string }[] => {
	// ... 此函数实现保持不变
	if (!hotSearches) return []
	try {
		return hotSearches.map((item) => ({
			id: `hot_${item.keyword}`,
			text: item.keyword,
		}))
	} catch (error) {
		bilibiliApiLog.error('转换热门搜索关键词失败:', error)
		return []
	}
}
