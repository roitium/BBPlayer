import { relations, sql } from 'drizzle-orm'
import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core'

// ----------------------------------
// 1. 艺术家/UP主 (artists)
// ----------------------------------
export const artists = sqliteTable('artists', {
	id: integer('id').primaryKey(), // Bilibili MID
	name: text('name').notNull(),
	avatarUrl: text('avatar_url'),
	signature: text('signature'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`), // 使用 unixepoch 获取毫秒时间戳
})

// ----------------------------------
// 2. 歌曲 (tracks)
// ----------------------------------
type msTimestamp = number

export const tracks = sqliteTable('tracks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bvid: text('bvid').notNull(),
	cid: integer('cid'),
	title: text('title').notNull(),
	artistId: integer('artist_id').references(() => artists.id, {
		onDelete: 'set null', // 如果作者被删除，歌曲的作者ID设为NULL
	}),
	coverUrl: text('cover_url'),
	duration: integer('duration'),
	playCountSequence: text('play_count_sequence', {
		// 每次播放的时间
		mode: 'json',
	})
		.$type<msTimestamp[]>()
		.default(sql`'[]'`),
	isMultiPage: integer('is_multi_page', { mode: 'boolean' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
})

// ----------------------------------
// 3. 播放列表 (playlists)
// ----------------------------------
export const playlists = sqliteTable('playlists', {
	id: integer('id').primaryKey(), // Bilibili favorite/collection ID
	title: text('title').notNull(),
	authorId: integer('author_id').references(() => artists.id, {
		onDelete: 'set null',
	}),
	description: text('description'),
	coverUrl: text('cover_url'),
	itemCount: integer('item_count').notNull().default(0),
	type: text('type', {
		enum: ['favorite', 'collection', 'multi_page', 'local'],
	}).notNull(),
	lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
})

// ----------------------------------
// 4. 播放列表-歌曲关系表 (playlist_tracks)
// ----------------------------------
export const playlistTracks = sqliteTable('playlist_tracks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	playlistId: integer('playlist_id')
		.notNull()
		.references(() => playlists.id, { onDelete: 'cascade' }), // 级联删除
	trackId: integer('track_id')
		.notNull()
		.references(() => tracks.id, { onDelete: 'cascade' }), // 级联删除
	order: integer('order'), // 歌曲在列表中的顺序
})

// ----------------------------------
// 5. 搜索历史 (search_history)
// ----------------------------------
export const searchHistory = sqliteTable(
	'search_history',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		query: text('query').notNull(),
		timestamp: integer('timestamp', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(table) => [uniqueIndex('query_unq').on(table.query)],
)

// ##################################
// RELATIONS
// ##################################

export const artistRelations = relations(artists, ({ many }) => ({
	tracks: many(tracks),
	authoredPlaylists: many(playlists),
}))

export const trackRelations = relations(tracks, ({ one, many }) => ({
	artist: one(artists, {
		fields: [tracks.artistId],
		references: [artists.id],
	}),
	playlistLinks: many(playlistTracks),
}))

export const playlistRelations = relations(playlists, ({ one, many }) => ({
	author: one(artists, {
		fields: [playlists.authorId],
		references: [artists.id],
	}),
	trackLinks: many(playlistTracks),
}))

export const playlistTrackRelations = relations(playlistTracks, ({ one }) => ({
	playlist: one(playlists, {
		fields: [playlistTracks.playlistId],
		references: [playlists.id],
	}),
	track: one(tracks, {
		fields: [playlistTracks.trackId],
		references: [tracks.id],
	}),
}))
