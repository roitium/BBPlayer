import { relations, sql } from 'drizzle-orm'
import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core'

type msTimestamp = number

export const artists = sqliteTable(
	'artists',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		avatarUrl: text('avatar_url'),
		signature: text('signature'),
		source: text('source', {
			enum: ['bilibili', 'local'],
		}).notNull(),
		remoteId: text('remote_id'), // 比如 bilibili mid
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(table) => [
		uniqueIndex('source_remote_id_unq').on(table.source, table.remoteId),
	],
)

export const tracks = sqliteTable('tracks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	artistId: integer('artist_id').references(() => artists.id, {
		onDelete: 'set null', // 如果作者被删除，歌曲的作者ID设为NULL，歌曲本身不删除
	}),
	coverUrl: text('cover_url'),
	duration: integer('duration'),
	playCountSequence: text('play_count_sequence', {
		// 每次播放的时间
		mode: 'json',
	})
		.$type<msTimestamp[]>()
		.default(sql`'[]'`),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	source: text('source', {
		enum: ['bilibili', 'local'],
	}),
})

export const playlists = sqliteTable('playlists', {
	id: integer('id').primaryKey({ autoIncrement: true }), // 数据库内的唯一 id
	title: text('title').notNull(),
	authorId: integer('author_id').references(() => artists.id, {
		onDelete: 'set null', // 如果作者被删除，播放列表的作者ID设为NULL
	}),
	description: text('description'),
	coverUrl: text('cover_url'),
	itemCount: integer('item_count').notNull().default(0),
	type: text('type', {
		enum: ['favorite', 'collection', 'multi_page', 'local'],
	}).notNull(),
	remoteSyncId: integer('remote_sync_id'), // 当存在这个值时，这个 playlist 只能从远程同步，而不能从本地直接修改（或许也可以？因为我们已经实现了大量本地有关收藏夹的操作逻辑，先不管了~）
	lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
})

export const playlistTracks = sqliteTable('playlist_tracks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	playlistId: integer('playlist_id')
		.notNull()
		.references(() => playlists.id, { onDelete: 'cascade' }), // 级联删除
	trackId: integer('track_id')
		.notNull()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	order: integer('order'), // 歌曲在列表中的顺序
})

export const bilibiliMetadata = sqliteTable('bilibili_metadata', {
	trackId: integer('track_id')
		.primaryKey()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	bvid: text('bvid').notNull(),
	cid: integer('cid'),
	isMultiPart: integer('is_multi_part', { mode: 'boolean' }).notNull(),
	createAt: integer('create_at', { mode: 'timestamp_ms' }).notNull(),
})

export const localMetadata = sqliteTable('local_metadata', {
	trackId: integer('track_id')
		.primaryKey()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	localPath: text('local_path').notNull(),
})

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
	bilibiliMetadata: one(bilibiliMetadata, {
		fields: [tracks.id],
		references: [bilibiliMetadata.trackId],
	}),
	localMetadata: one(localMetadata, {
		fields: [tracks.id],
		references: [localMetadata.trackId],
	}),
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

export const bilibiliMetadataRelations = relations(
	bilibiliMetadata,
	({ one }) => ({
		track: one(tracks, {
			fields: [bilibiliMetadata.trackId],
			references: [tracks.id],
		}),
	}),
)

export const localMetadataRelations = relations(localMetadata, ({ one }) => ({
	track: one(tracks, {
		fields: [localMetadata.trackId],
		references: [tracks.id],
	}),
}))
