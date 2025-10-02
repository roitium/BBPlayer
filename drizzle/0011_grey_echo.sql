CREATE TABLE `track_downloads` (
	`track_id` integer PRIMARY KEY NOT NULL,
	`downloadedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`status` text NOT NULL,
	`file_size` integer,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `track_downloads_track_idx` ON `track_downloads` (`track_id`);