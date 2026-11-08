CREATE TABLE `campus_lms_snapshots` (
	`course_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_lms_snapshots_owner` ON `campus_lms_snapshots` (`owner_id`);