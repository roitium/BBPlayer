import { faker } from '@faker-js/faker'
import { eq } from 'drizzle-orm'
import db from './db'
import * as schema from './schema'

// --- 配置项 ---
const ARTIST_COUNT = 10
const TRACK_COUNT = 50
const PLAYLIST_COUNT = 5
const MAX_TRACKS_PER_PLAYLIST = 15

/**
 * 重置数据库，清空所有表的数据
 * 注意删除顺序，防止外键约束失败
 */
async function cleanup() {
	console.log('🧹 Clearing old data...')
	// 必须先删除依赖于其他表的记录
	await db.delete(schema.playlistTracks)
	await db.delete(schema.playlists)
	await db.delete(schema.tracks)
	await db.delete(schema.artists)
	await db.delete(schema.searchHistory)
	console.log('✅ Database cleared.')
}

/**
 * 生成并插入 Artists
 */
async function seedArtists() {
	console.log('👤 Seeding artists...')
	const newArtists = []
	for (let i = 0; i < ARTIST_COUNT; i++) {
		newArtists.push({
			id: faker.number.int({ min: 10000, max: 99999999 }), // 模拟B站MID
			name: faker.person.fullName(),
			avatarUrl: faker.image.avatar(),
			signature: faker.lorem.sentence(),
		})
	}
	await db.insert(schema.artists).values(newArtists)
	return await db.select({ id: schema.artists.id }).from(schema.artists)
}

/**
 * 生成并插入 Tracks
 * @param existingArtists - 已存在的 artist 记录，用于关联
 */
async function seedTracks(existingArtists: { id: number }[]) {
	console.log('🎵 Seeding tracks...')
	const newTracks = []
	for (let i = 0; i < TRACK_COUNT; i++) {
		newTracks.push({
			bvid: `BV1${faker.string.alphanumeric(9)}`, // 模拟B站BVID
			cid: faker.number.int({ min: 100000, max: 99999999 }),
			title: faker.music.songName(),
			artistId: faker.helpers.arrayElement(existingArtists).id,
			coverUrl: faker.image.urlLoremFlickr({ category: 'music' }),
			duration: faker.number.int({ min: 60, max: 360 }), // 持续时间（秒）
			isMultiPage: faker.datatype.boolean(0.1), // 10% 的概率是多P
			source: faker.helpers.arrayElement(['bilibili', 'local']),
		})
	}
	await db.insert(schema.tracks).values(newTracks)
	return await db.select({ id: schema.tracks.id }).from(schema.tracks)
}

/**
 * 生成并插入 Playlists
 * @param existingArtists - 已存在的 artist 记录，用于关联
 */
async function seedPlaylists(existingArtists: { id: number }[]) {
	console.log('🎶 Seeding playlists...')
	const newPlaylists = []
	for (let i = 0; i < PLAYLIST_COUNT; i++) {
		newPlaylists.push({
			id: faker.number.int({ min: 1000000, max: 99999999 }), // 模拟B站收藏夹ID
			title: faker.lorem.words({ min: 2, max: 5 }),
			authorId: faker.helpers.arrayElement(existingArtists).id,
			description: faker.lorem.paragraph(),
			coverUrl: faker.image.urlLoremFlickr({ category: 'abstract' }),
			type: faker.helpers.arrayElement([
				'favorite',
				'collection',
				'multi_page',
				'local',
			]),
			// itemCount 初始为 0，后面再更新
		})
	}
	await db.insert(schema.playlists).values(newPlaylists)
	return await db.select({ id: schema.playlists.id }).from(schema.playlists)
}

/**
 * 创建播放列表和歌曲之间的关联
 * @param existingPlaylists - 已存在的 playlist 记录
 * @param existingTracks - 已存在的 track 记录
 */
async function linkPlaylistsAndTracks(
	existingPlaylists: { id: number }[],
	existingTracks: { id: number }[],
) {
	console.log('🔗 Linking playlists and tracks...')
	for (const playlist of existingPlaylists) {
		const numTracksToLink = faker.number.int({
			min: 1,
			max: MAX_TRACKS_PER_PLAYLIST,
		})
		const tracksToLink = faker.helpers.arrayElements(
			existingTracks,
			numTracksToLink,
		)

		if (tracksToLink.length > 0) {
			const links = tracksToLink.map((track, index) => ({
				playlistId: playlist.id,
				trackId: track.id,
				order: index + 1,
			}))
			await db.insert(schema.playlistTracks).values(links)

			// 更新 playlist 表中的 itemCount
			await db
				.update(schema.playlists)
				.set({ itemCount: tracksToLink.length })
				.where(eq(schema.playlists.id, playlist.id))
		}
	}
}

/**
 * 生成搜索历史
 */
async function seedSearchHistory() {
	console.log('🔍 Seeding search history...')
	const queries = []
	for (let i = 0; i < 20; i++) {
		queries.push({
			query: faker.lorem.word(),
		})
	}
	// 使用 onConflictDoNothing() 是因为 query 字段是唯一的，Faker 可能会生成重复词语
	await db.insert(schema.searchHistory).values(queries).onConflictDoNothing()
}

export async function main() {
	try {
		await cleanup()

		// 注意执行顺序，被依赖的表需要先填充
		const artists = await seedArtists()
		const tracks = await seedTracks(artists)
		const playlists = await seedPlaylists(artists)

		await linkPlaylistsAndTracks(playlists, tracks)

		await seedSearchHistory()

		console.log(
			'\n🎉 Seed complete! Your database is now populated with fake data.',
		)
	} catch (error) {
		console.error('❌ An error occurred during seeding:', error)
	}
}
