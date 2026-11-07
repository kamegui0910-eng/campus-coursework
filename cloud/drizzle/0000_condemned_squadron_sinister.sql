CREATE TABLE `campus_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`course_id` text NOT NULL,
	`external_id` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`rubric` text DEFAULT '' NOT NULL,
	`due_at` text DEFAULT '' NOT NULL,
	`chapter` text DEFAULT '' NOT NULL,
	`material_ids` text DEFAULT '[]' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`revision` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'NotStarted' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_assignments_owner_course` ON `campus_assignments` (`owner_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `campus_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`school_url` text NOT NULL,
	`external_id` text DEFAULT '' NOT NULL,
	`term` text DEFAULT '' NOT NULL,
	`lms_type` text DEFAULT 'other' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_courses_owner` ON `campus_courses` (`owner_id`);--> statement-breakpoint
CREATE TABLE `campus_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`characters` integer NOT NULL,
	`object_key` text NOT NULL,
	`text_key` text NOT NULL,
	`source_sha` text NOT NULL,
	`text_sha` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`extraction_status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_materials_owner_course` ON `campus_materials` (`owner_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `campus_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`course_id` text NOT NULL,
	`assignment_id` text,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`body` text NOT NULL,
	`sources` text NOT NULL,
	`gaps` text NOT NULL,
	`model` text NOT NULL,
	`status` text DEFAULT 'ReadyForReview' NOT NULL,
	`complete` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_outputs_owner_course` ON `campus_outputs` (`owner_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `campus_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`model` text DEFAULT '{}' NOT NULL,
	`model_secret` text,
	`canvas` text DEFAULT '{}' NOT NULL,
	`canvas_secret` text,
	`updated_at` text NOT NULL
);
