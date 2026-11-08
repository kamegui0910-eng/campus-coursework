CREATE TABLE `campus_model_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`state_hash` text NOT NULL,
	`verifier_secret` text NOT NULL,
	`expires_at` integer NOT NULL
);
