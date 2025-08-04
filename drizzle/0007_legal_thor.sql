ALTER TABLE `tracks` ADD `play_history` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `tracks` DROP COLUMN `play_count_sequence`;