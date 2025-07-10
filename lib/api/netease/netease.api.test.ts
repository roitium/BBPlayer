import { createNeteaseApi } from './netease.api'

describe('Netease API Integration Tests', () => {
	const api = createNeteaseApi()

	it('should fetch lyrics for a given song ID', async () => {
		const songId = 2003496380
		const result = await api.getLyrics(songId)

		if (result.isOk()) {
			const data = result.value
			expect(data).toBeDefined()
			expect(data.lrc).toBeDefined()
			expect(data.lrc.lyric).toContain('[00:')
		} else {
			throw result.error
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
			expect(data.result.songs.length).toBeGreaterThan(0)
		} else {
			throw result.error
		}
	}, 15000)
})
