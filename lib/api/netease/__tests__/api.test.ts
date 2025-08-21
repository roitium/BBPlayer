import { neteaseApi } from '../api'

describe('Netease API 集成测试', () => {
	it('应该能够正确根据 songId 获取歌词', async () => {
		const songId = 2003496380 // A known song ID
		const result = await neteaseApi.getLyrics(songId)

		if (result.isOk()) {
			const data = result.value
			expect(data).toBeDefined()
			expect(data.lrc).toBeDefined()
			expect(data.lrc.lyric).toContain('[00:')
		} else {
			throw result.error
		}
	}, 15000)

	it('应该能够正确搜索歌曲', async () => {
		const result = await neteaseApi.search({
			keywords: '不要揭开皮影的盒',
			limit: 2,
			type: 1,
		})

		if (result.isOk()) {
			const data = result.value
			expect(data).toBeDefined()
			expect(data.result.songs.length).toBeGreaterThan(0)
		} else {
			throw result.error
		}
	}, 15000)

	it.only('应该能够正确根据关键词找到最佳匹配的歌曲', async () => {
		const keyword = '【洛天依】世末积雨云'
		const searchResult = await neteaseApi.search({
			keywords: keyword,
			limit: 30,
			type: 1,
		})

		if (searchResult.isOk()) {
			const songs = searchResult.value.result.songs
			console.log(JSON.stringify(songs, null, 2))
			const bestMatch = neteaseApi.findBestMatch(songs, keyword)
			expect(bestMatch).toBeDefined()
			console.log(JSON.stringify(bestMatch, null, 2))
		} else {
			throw searchResult.error
		}
	}, 15000)
})
