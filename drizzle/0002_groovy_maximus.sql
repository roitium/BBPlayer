CREATE TABLE `bilibili_metadata` (
	`track_id` integer PRIMARY KEY NOT NULL,
	`bvid` text NOT NULL,
	`cid` integer,
	`is_multi_part` integer NOT NULL,
	`create_at` integer NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `local_metadata` (
	`track_id` integer PRIMARY KEY NOT NULL,
	`local_path` text NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `search_history`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`signature` text,
	`source` text NOT NULL,
	`remote_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_artists`("id", "name", "avatar_url", "signature", "source", "remote_id", "created_at") SELECT "id", "name", "avatar_url", "signature", "source", "remote_id", "created_at" FROM `artists`;--> statement-breakpoint
DROP TABLE `artists`;--> statement-breakpoint
ALTER TABLE `__new_artists` RENAME TO `artists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `source_remote_id_unq` ON `artists` (`source`,`remote_id`);--> statement-breakpoint
CREATE TABLE `__new_playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`author_id` integer,
	`description` text,
	`cover_url` text,
	`item_count` integer DEFAULT 0 NOT NULL,
	`type` text NOT NULL,
	`remote_sync_id` integer,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_playlists`("id", "title", "author_id", "description", "cover_url", "item_count", "type", "remote_sync_id", "last_synced_at", "created_at") SELECT "id", "title", "author_id", "description", "cover_url", "item_count", "type", "remote_sync_id", "last_synced_at", "created_at" FROM `playlists`;--> statement-breakpoint
DROP TABLE `playlists`;--> statement-breakpoint
ALTER TABLE `__new_playlists` RENAME TO `playlists`;--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `bvid`;--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `cid`;--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `is_multi_page`;