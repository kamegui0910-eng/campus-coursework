CREATE TABLE `campus_onboarding` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'ai' NOT NULL,
	`step` integer DEFAULT 0 NOT NULL,
	`course_deferred` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`updated_at` text NOT NULL
);
