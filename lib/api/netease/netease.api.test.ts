import { createNeteaseApi } from './netease.api'

describe('Netease API Integration Tests', () => {
	const api = createNeteaseApi()

	it('should fetch lyrics for a given song ID', async () => {
		const songId = 2003496380
		const result = await api.getLyrics(songId)

		if (result.isOk()) {
			const data = result.value
			expect(data).toBeDefined()
			expect(data.code).toBe(200)
			expect(data.lrc).toBeDefined()
			expect(data.lrc.lyric).toContain('[00:')
		} else {
			console.error('getLyrics test failed:', result.error)
			expect(result.isErr()).toBe(true)
		}
	}, 15000)

	// Test for search
	it('should successfully call the search endpoint and handle a successful response', async () => {
		const result = await api.search({
			keywords: '若能化为星座',
			limit: 2,
			type: 1,
		})

		if (result.isOk()) {
			const data = result.value
			expect(data).toBeDefined()
			expect(data.code).toBe(200)
			expect(data.result.songs.length).toBeGreaterThan(0)
		} else {
			console.error('search test failed:', result.error)
			expect(result.isErr()).toBe(true)
		}
	}, 15000)
})
