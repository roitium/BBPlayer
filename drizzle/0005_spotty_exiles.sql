PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_playlist_tracks` (
	`playlist_id` integer NOT NULL,
	`track_id` integer NOT NULL,
	`order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`playlist_id`, `track_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_playlist_tracks`("playlist_id", "track_id", "order", "created_at") SELECT "playlist_id", "track_id", "order", "created_at" FROM `playlist_tracks`;--> statement-breakpoint
DROP TABLE `playlist_tracks`;--> statement-breakpoint
ALTER TABLE `__new_playlist_tracks` RENAME TO `playlist_tracks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `playlist_tracks_playlist_idx` ON `playlist_tracks` (`playlist_id`);--> statement-breakpoint
CREATE INDEX `playlist_tracks_track_idx` ON `playlist_tracks` (`track_id`);--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unique_key` text NOT NULL,
	`title` text NOT NULL,
	`artist_id` integer,
	`cover_url` text,
	`duration` integer,
	`play_count_sequence` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_tracks`("id", "unique_key", "title", "artist_id", "cover_url", "duration", "play_count_sequence", "created_at", "source") SELECT "id", "unique_key", "title", "artist_id", "cover_url", "duration", "play_count_sequence", "created_at", "source" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_unique_key_unique` ON `tracks` (`unique_key`);--> statement-breakpoint
CREATE INDEX `tracks_artist_idx` ON `tracks` (`artist_id`);--> statement-breakpoint
CREATE INDEX `tracks_title_idx` ON `tracks` (`title`);--> statement-breakpoint
CREATE INDEX `tracks_source_idx` ON `tracks` (`source`);--> statement-breakpoint
CREATE INDEX `artists_name_idx` ON `artists` (`name`);--> statement-breakpoint
CREATE INDEX `playlists_title_idx` ON `playlists` (`title`);--> statement-breakpoint
CREATE INDEX `playlists_type_idx` ON `playlists` (`type`);--> statement-breakpoint
CREATE INDEX `playlists_author_idx` ON `playlists` (`author_id`);