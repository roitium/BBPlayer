import * as FileSystem from 'expo-file-system'

import { neteaseApi } from './api'

describe('Netease API Integration Tests', () => {
	it('should fetch lyrics for a given song ID', async () => {
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

	it('should successfully call the search endpoint', async () => {
		const result = await neteaseApi.search({
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

	describe('smartFetchLyrics', () => {
		const testDir = FileSystem.cacheDirectory + 'netease-test/'
		const keyword = 'Lemon'
		const internalId = 'test-lemon-id'
		const filePath = `${testDir}${internalId}.json`

		beforeEach(async () => {
			await FileSystem.deleteAsync(testDir, { idempotent: true })
			await FileSystem.makeDirectoryAsync(testDir, { intermediates: true })
		})

		afterAll(async () => {
			await FileSystem.deleteAsync(testDir, { idempotent: true })
		})

		it('should fetch lyrics from network when cache is empty', async () => {
			const result = await neteaseApi.smartFetchLyrics({
				keyword,
				internalId,
				path: testDir,
			})

			if (result.isOk()) {
				const lyrics = result.value
				expect(lyrics).toBeDefined()
				expect(lyrics.lrc.lyric).toContain('夢ならばどれほどよかったでしょう')

				// Verify that the file was created
				const fileInfo = await FileSystem.getInfoAsync(filePath)
				expect(fileInfo.exists).toBe(true)
			} else {
				throw result.error
			}
		}, 20000)

		it('should fetch lyrics from cache when file exists', async () => {
			// 1. First, fetch from network to populate the cache
			const initialResult = await neteaseApi.smartFetchLyrics({
				keyword,
				internalId,
				path: testDir,
			})

			if (initialResult.isErr()) {
				throw initialResult.error
			}

			// 2. Now, spy on the network calls to ensure they are NOT made
			const searchSpy = jest.spyOn(neteaseApi, 'search')
			const getLyricsSpy = jest.spyOn(neteaseApi, 'getLyrics')

			const cachedResult = await neteaseApi.smartFetchLyrics({
				keyword,
				internalId,
				path: testDir,
			})

			if (cachedResult.isOk()) {
				const lyrics = cachedResult.value
				expect(lyrics).toBeDefined()
				expect(lyrics.lrc.lyric).toContain('夢ならばどれほどよかったでしょう')

				// Verify that the network calls were not made
				expect(searchSpy).not.toHaveBeenCalled()
				expect(getLyricsSpy).not.toHaveBeenCalled()
			} else {
				throw cachedResult.error
			}

			// Clean up spies
			searchSpy.mockRestore()
			getLyricsSpy.mockRestore()
		}, 20000)
	})
})
