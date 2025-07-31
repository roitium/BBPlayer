// src/db/seed.ts
import { faker } from '@faker-js/faker'
import { eq } from 'drizzle-orm'
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

// --- 引入你的业务逻辑和类型 ---
// 请确保以下路径在你的项目中是正确的
import generateUniqueTrackKey from '@/lib/services/genKey'
import { TrackSourceData } from '@/types/services/track'

// 定义要插入的数据量
const NUM_BILIBILI_ARTISTS = 3
const NUM_LOCAL_ARTISTS = 1
const TRACKS_PER_ARTIST = 5
const FAVORITE_TRACKS_COUNT = 8

type DrizzleDB = ExpoSQLiteDatabase<typeof schema>

/**
 * Seeds the database using business logic for key generation.
 * @param db The Drizzle instance connected to the Expo SQLite database.
 */
export const seedDatabase = async (db: DrizzleDB) => {
	console.log('Seeding database...')

	try {
		// 1. 清空数据 (顺序不变)
		console.log('Clearing existing data...')
		await db.delete(schema.playlistTracks)
		await db.delete(schema.bilibiliMetadata)
		await db.delete(schema.localMetadata)
		await db.delete(schema.playlists)
		await db.delete(schema.tracks)
		await db.delete(schema.artists)
		console.log('Data cleared.')

		// 2. 创建 Artists (逻辑不变)
		console.log('Seeding artists...')
		const artistsToInsert: (typeof schema.artists.$inferInsert)[] = []
		artistsToInsert.push({
			name: 'MyLocalUser',
			source: 'local',
			signature: 'Just me and my music.',
		})
		for (let i = 0; i < NUM_BILIBILI_ARTISTS; i++) {
			artistsToInsert.push({
				name: faker.person.fullName(),
				avatarUrl: faker.image.avatar(),
				signature: faker.lorem.sentence(),
				source: 'bilibili',
				remoteId: faker.string.numeric(10),
			})
		}
		for (let i = 0; i < NUM_LOCAL_ARTISTS; i++) {
			artistsToInsert.push({
				name: faker.person.fullName(),
				source: 'local',
				signature: 'Local tunes producer.',
			})
		}
		const createdArtists = await db
			.insert(schema.artists)
			.values(artistsToInsert)
			.returning()
		console.log(`Created ${createdArtists.length} artists.`)

		// 3. 创建 Tracks 及其 Metadata (!!! 此处逻辑已更新 !!!)
		console.log(
			'Seeding tracks and their metadata using generateUniqueTrackKey...',
		)

		// 我们需要一个临时结构来保存即将插入的 track 和它的元数据
		const tracksAndMetaToCreate = []

		for (const artist of createdArtists) {
			for (let i = 0; i < TRACKS_PER_ARTIST; i++) {
				const title = faker.music.songName()

				// 步骤 1: 准备 generateUniqueTrackKey 需要的 payload
				let payload: TrackSourceData

				if (artist.source === 'bilibili') {
					const biliMetaPayload = {
						bvid: `BV1${faker.string.alphanumeric(9)}`,
						cid: faker.number.int({ min: 100000000, max: 999999999 }),
						isMultiPart: faker.datatype.boolean(0.1), // 10% 概率为多P视频
					}
					payload = { source: 'bilibili', bilibiliMetadata: biliMetaPayload }
				} else {
					// local
					const localMetaPayload = {
						localPath: `/Users/music/${artist.name}/${title}.mp3`.replace(
							/\s/g,
							'_',
						),
					}
					payload = { source: 'local', localMetadata: localMetaPayload }
				}

				// 步骤 2: 调用你的函数生成 uniqueKey
				const uniqueKeyResult = generateUniqueTrackKey(payload)
				if (uniqueKeyResult.isErr()) {
					console.error('Failed to generate unique key:', uniqueKeyResult.error)
					continue // 如果生成失败，跳过这条 track
				}
				const uniqueKey = uniqueKeyResult.value

				// 步骤 3: 暂存 Track 和它的元数据
				const trackData = {
					uniqueKey,
					title,
					artistId: artist.id,
					coverUrl: faker.image.urlLoremFlickr({ category: 'music' }),
					duration: faker.number.int({ min: 150 * 1000, max: 300 * 1000 }),
					playCountSequence: JSON.stringify(
						Array.from({ length: faker.number.int({ min: 0, max: 50 }) }, () =>
							faker.date.recent({ days: 365 }).getTime(),
						),
					),
					source: artist.source,
				}

				tracksAndMetaToCreate.push({ trackData, metadataPayload: payload })
			}
		}

		// 步骤 4: 批量插入 Tracks
		const tracksToInsert = tracksAndMetaToCreate.map((item) => item.trackData)
		const createdTracks = await db
			.insert(schema.tracks)
			.values(tracksToInsert)
			.returning()
		console.log(`Created ${createdTracks.length} tracks.`)

		// 步骤 5: 使用返回的 trackId，批量插入 Metadata
		const bilibiliMetadataToInsert: (typeof schema.bilibiliMetadata.$inferInsert)[] =
			[]
		const localMetadataToInsert: (typeof schema.localMetadata.$inferInsert)[] =
			[]

		for (const track of createdTracks) {
			const correspondingMeta = tracksAndMetaToCreate.find(
				(item) => item.trackData.uniqueKey === track.uniqueKey,
			)
			if (!correspondingMeta) continue

			if (track.source === 'bilibili') {
				bilibiliMetadataToInsert.push({
					trackId: track.id,
					...correspondingMeta.metadataPayload.bilibiliMetadata!,
				})
			} else if (track.source === 'local') {
				localMetadataToInsert.push({
					trackId: track.id,
					...correspondingMeta.metadataPayload.localMetadata!,
				})
			}
		}

		if (bilibiliMetadataToInsert.length > 0) {
			await db.insert(schema.bilibiliMetadata).values(bilibiliMetadataToInsert)
		}
		if (localMetadataToInsert.length > 0) {
			await db.insert(schema.localMetadata).values(localMetadataToInsert)
		}
		console.log('Created corresponding metadata entries.')

		// 4. 创建 Playlists (!!! 此处逻辑已更新 !!!)
		console.log('Seeding playlists...')
		const localUser = createdArtists.find((a) => a.name === 'MyLocalUser')!
		const aBilibiliArtist = createdArtists.find((a) => a.source === 'bilibili')!

		const playlistsToInsert: (typeof schema.playlists.$inferInsert)[] = [
			{
				title: '我喜欢的音乐',
				authorId: localUser.id,
				description: '自动创建的最爱列表',
				type: 'favorite', // 非 'local' 类型
				remoteSyncId: faker.number.int({ min: 10000, max: 99999 }), // 添加 remoteSyncId
				coverUrl: faker.image.urlLoremFlickr({ category: 'love' }),
			},
			{
				title: `${aBilibiliArtist.name} 的精选集`,
				authorId: aBilibiliArtist.id,
				description: `从B站同步的 ${aBilibiliArtist.name} 的官方收藏夹`,
				type: 'collection', // 非 'local' 类型
				remoteSyncId: faker.number.int({ min: 10000, max: 99999 }), // 已存在
				lastSyncedAt: new Date(),
				coverUrl: aBilibiliArtist.avatarUrl,
			},
			{
				title: '深夜驾驶 Lofi',
				authorId: localUser.id,
				description: '适合一个人开车时听',
				type: 'local', // 'local' 类型，不需要 remoteSyncId
				coverUrl: faker.image.urlLoremFlickr({ category: 'night' }),
			},
		]

		const createdPlaylists = await db
			.insert(schema.playlists)
			.values(playlistsToInsert)
			.returning()
		console.log(`Created ${createdPlaylists.length} playlists.`)

		// 5. 关联 Tracks 和 Playlists (逻辑不变)
		console.log('Seeding playlist_tracks associations...')
		const playlistTracksToInsert: (typeof schema.playlistTracks.$inferInsert)[] =
			[]
		const favoritePlaylist = createdPlaylists.find(
			(p) => p.type === 'favorite',
		)!
		const randomTracksForFavorite = faker.helpers.arrayElements(
			createdTracks,
			FAVORITE_TRACKS_COUNT,
		)
		randomTracksForFavorite.forEach((track, index) => {
			playlistTracksToInsert.push({
				playlistId: favoritePlaylist.id,
				trackId: track.id,
				order: index,
			})
		})
		const bilibiliPlaylist = createdPlaylists.find(
			(p) => p.type === 'collection',
		)!
		const bilibiliTracks = createdTracks.filter(
			(t) => t.artistId === bilibiliPlaylist.authorId,
		)
		bilibiliTracks.forEach((track, index) => {
			playlistTracksToInsert.push({
				playlistId: bilibiliPlaylist.id,
				trackId: track.id,
				order: index,
			})
		})
		await db.insert(schema.playlistTracks).values(playlistTracksToInsert)
		console.log(
			`Associated ${playlistTracksToInsert.length} tracks with playlists.`,
		)

		// 6. 更新 Playlists 的 itemCount (逻辑不变)
		console.log('Updating playlist item counts...')
		await db
			.update(schema.playlists)
			.set({ itemCount: randomTracksForFavorite.length })
			.where(eq(schema.playlists.id, favoritePlaylist.id))
		await db
			.update(schema.playlists)
			.set({ itemCount: bilibiliTracks.length })
			.where(eq(schema.playlists.id, bilibiliPlaylist.id))
		console.log('Item counts updated.')

		console.log('Seeding complete!')
	} catch (error) {
		console.error('An error occurred during seeding:', error)
		throw error
	}
}

export const addSomeTracksToSpecificPlaylist = async (
	db: DrizzleDB,
	playlistId: number,
	trackCount: number,
) => {
	console.log('Adding some tracks to playlist...')
	const playlist = await db.query.playlists.findFirst({
		where: eq(schema.playlists.id, playlistId),
		with: {
			trackLinks: true,
		},
	})
	if (!playlist) {
		throw new Error('Playlist not found')
	}
	const tracks = playlist.trackLinks.map((trackLink) => trackLink.track)
	const newTracks = tracks.slice(0, trackCount)
	await db.insert(schema.playlistTracks).values(
		newTracks.map((track) => ({
			playlistId,
			trackId: track.id,
			order: tracks.length,
		})),
	)
	console.log(`Added ${newTracks.length} tracks to playlist.`)
}
