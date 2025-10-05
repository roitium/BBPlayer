/**
 * 获取音频流入参（dash）
 */
interface BilibiliAudioStreamParams {
	bvid: string
	cid: number
	audioQuality: number
	enableDolby: boolean
	enableHiRes: boolean
}

/**
 * 获取音频流（dash）返回值
 */
interface BilibiliAudioStreamResponse {
	dash: {
		audio:
			| {
					id: number
					baseUrl: string
					backupUrl: string[]
			  }[]
			| null
		dolby?: {
			type: number
			audio:
				| {
						id: number
						baseUrl: string
						backupUrl: string[]
				  }[]
				| null
		} | null
		flac?: {
			display: boolean
			audio: {
				id: number
				baseUrl: string
				backupUrl: string[]
			} | null
		} | null
	}
}

/**
 * 历史记录获得的视频信息
 */
interface BilibiliHistoryVideo {
	aid: number
	bvid: string
	title: string
	pic: string
	pubdate: number
	owner: {
		name: string
		mid: number
		face: string
	}
	duration: number
}

/**
 * 通过details接口获取的视频完整信息
 */
interface BilibiliVideoDetails {
	aid: number
	bvid: string
	title: string
	pic: string
	pubdate: number
	duration: number
	desc: string
	owner: {
		name: string
		mid: number
		face: string
	}
	cid: number
	pages: BilibiliVideoDetailsPage[]
}

/**
 * bilibili 视频详情接口获取到的 pages 字段
 */
interface BilibiliVideoDetailsPage {
	part: string
	duration: number
	cid: number
}

/**
 * 收藏夹信息
 */
interface BilibiliPlaylist {
	id: number
	title: string
	media_count: number
	fav_state: number // 目标 id 是否存在于收藏夹中：0：不存在；1：存在（当未提供 rid 时始终为 0）
}

/**
 * 搜索结果视频信息
 */
interface BilibiliSearchVideo {
	aid: number
	bvid: string
	title: string
	pic: string
	author: string
	duration: string
	senddate: number
	mid: number
}

/**
 * 热门搜索信息
 */
interface BilibiliHotSearch {
	keyword: string
	show_name: string
}

/**
 * 用户详细信息
 */
interface BilibiliUserInfo {
	mid: number
	name: string
	face: string
	sign: string
}

/**
 * 收藏夹内容项
 */
interface BilibiliFavoriteListContent {
	id: number
	bvid: string
	upper: {
		mid: number
		name: string
		face: string
	}
	title: string
	cover: string
	duration: number
	pubdate: number
	page: number
	type: number // 2：视频稿件 12：音频 21：视频合集
	attr: number // 失效	0: 正常；9: up自己删除；1: 其他原因删除
}

/**
 * 收藏夹内容列表
 */
interface BilibiliFavoriteListContents {
	info: {
		id: number
		title: string
		cover: string
		media_count: number
		intro: string
		upper: {
			name: string
			face: string
			mid: number
		}
	}
	medias: BilibiliFavoriteListContent[] | null
	has_more: boolean
	ttl: number
}

/**
 * 收藏夹所有内容（仅ID）
 */
type BilibiliFavoriteListAllContents = {
	id: number
	bvid: string
	type: number // 2：视频稿件 12：音频 21：视频合集
}[]

/**
 * 追更合集/收藏夹列表中的单项数据
 */
interface BilibiliCollection {
	id: number
	title: string
	cover: string
	upper: {
		mid: number
		name: string
		// face: string 恒为空
	}
	media_count: number
	ctime: number // 创建时间
	intro: string
	attr: number // 在不转换成 8-bit 的情况下，可能会有值：22 关注的别人收藏夹 0 追更视频合集 1 已失效（应通过 state 来区分）
	state: 0 | 1 // 0: 正常；1:收藏夹已失效
}

/**
 * 追更合集/收藏夹内容
 */
interface BilibiliCollectionContent {
	info: {
		id: number
		season_type: number // 未知
		title: string
		cover: string
		media_count: number
		intro: string
		upper: {
			name: string
			mid: number
		}
	}
	medias: {
		id: number // avid
		bvid: string
		title: string
		cover: string
		intro: string
		duration: number
		pubtime: number
		upper: {
			mid: number
			name: string
		}
	}
}

/**
 * 合集详情信息
 */
interface BilibiliCollectionInfo {
	id: number
	season_type: number // wtf
	title: string
	cover: string
	upper: {
		mid: number
		name: string
	}
	cnt_info: {
		collect: number
		play: number
		danmaku: number
	}
	media_count: number
	intro: string
}

/**
 * 合集内单个内容
 */
interface BilibiliMediaItemInCollection {
	id: number
	title: string
	cover: string
	duration: number
	pubtime: number
	bvid: string
	upper: {
		mid: number
		name: string
	}
	cnt_info: {
		collect: number
		play: number
		danmaku: number
	}
}

/**
 * /x/space/fav/season/list
 * 合集内容
 */
interface BilibiliCollectionAllContents {
	info: BilibiliCollectionInfo
	medias: BilibiliMediaItemInCollection[] | null
}

/**
 * 分 p 视频数据
 */
interface BilibiliMultipageVideo {
	cid: number
	page: number
	part: string
	duration: number
	first_frame: string
}

/**
 * 添加/删除一个视频到收藏夹的响应
 */
interface BilibiliDealFavoriteForOneVideoResponse {
	prompt: boolean
	ga_data: unknown
	toast_msg: string
	success_num: number
}

/**
 * 用户上传内容接口返回
 */
interface BilibiliUserUploadedVideosResponse {
	page: {
		pn: number
		ps: number
		count: number
	}
	list: {
		vlist: {
			aid: number
			bvid: string
			title: string
			pic: string
			created: number
			length: string // MM:SS
			author: string // 不一定是所查询的 up 主本人，因为存在合作视频
		}[]
	}
}

enum BilibiliQrCodeLoginStatus {
	QRCODE_LOGIN_STATUS_WAIT = 86101, // 等待扫码
	QRCODE_LOGIN_STATUS_SCANNED_BUT_NOT_CONFIRMED = 86090, // 扫码但未确认
	QRCODE_LOGIN_STATUS_SUCCESS = 0, // 扫码成功
	QRCODE_LOGIN_STATUS_QRCODE_EXPIRED = 86038, // 二维码已过期
}

/**
 * 搜索建议
 */
interface BilibiliSearchSuggestionItem {
	term: string
	value: string
	ref: number
	name: string
	spid: number
	type: string
}

export type {
	BilibiliAudioStreamParams,
	BilibiliAudioStreamResponse,
	BilibiliCollection,
	BilibiliCollectionAllContents,
	BilibiliCollectionContent,
	BilibiliCollectionInfo,
	BilibiliDealFavoriteForOneVideoResponse,
	BilibiliFavoriteListAllContents,
	BilibiliFavoriteListContent,
	BilibiliFavoriteListContents,
	BilibiliHistoryVideo,
	BilibiliHotSearch,
	BilibiliMediaItemInCollection,
	BilibiliMultipageVideo,
	BilibiliPlaylist,
	BilibiliSearchSuggestionItem,
	BilibiliSearchVideo,
	BilibiliUserInfo,
	BilibiliUserUploadedVideosResponse,
	BilibiliVideoDetails,
}

export { BilibiliQrCodeLoginStatus }
