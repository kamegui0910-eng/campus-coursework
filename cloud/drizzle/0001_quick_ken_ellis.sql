CREATE TABLE `campus_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`course_id` text NOT NULL,
	`request_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`output_id` text NOT NULL,
	`retry_of` text,
	`lease_until` integer NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campus_jobs_request` ON `campus_jobs` (`owner_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `campus_jobs_owner_course` ON `campus_jobs` (`owner_id`,`course_id`);