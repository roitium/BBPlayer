PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`signature` text,
	`source` text NOT NULL,
	`remote_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "source_integrity_check" CHECK(
        (source = 'local' AND remote_id IS NULL) 
        OR 
        (source != 'local' AND remote_id IS NOT NULL)
      )
);
--> statement-breakpoint
INSERT INTO `__new_artists`("id", "name", "avatar_url", "signature", "source", "remote_id", "created_at", "updated_at") SELECT "id", "name", "avatar_url", "signature", "source", "remote_id", "created_at", "updated_at" FROM `artists`;--> statement-breakpoint
DROP TABLE `artists`;--> statement-breakpoint
ALTER TABLE `__new_artists` RENAME TO `artists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `source_remote_id_unq` ON `artists` (`source`,`remote_id`) WHERE source != 'local';--> statement-breakpoint
CREATE UNIQUE INDEX `local_artist_unq` ON `artists` (`name`) WHERE source = 'local';--> statement-breakpoint
CREATE INDEX `artists_name_idx` ON `artists` (`name`);--> statement-breakpoint
ALTER TABLE `playlists` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL;