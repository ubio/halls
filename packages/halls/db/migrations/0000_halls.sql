-- Halls: live student accommodation stock from A3, and the bookings UBIO
-- prepares against it. Sign-in tables match Orbit's so the shared D1 user
-- adapter can provision staff.
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`google_sub` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_unique` ON `users` (`google_sub`);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`nonce` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
-- A booking UBIO is preparing for a student. The room is copied as it was
-- offered when the request was made, so a later price change on the
-- operator's site never rewrites what was asked for. `status` is 'queued'
-- (no booking workflow connected), 'preparing', 'ready' (A3 filled the
-- operator's booking form up to, and not including, the final submit),
-- 'failed' or 'cancelled'. Halls never submits a booking itself.
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`option_id` text NOT NULL,
	`operator` text NOT NULL,
	`city` text NOT NULL,
	`building` text NOT NULL,
	`room_type` text NOT NULL,
	`room_url` text NOT NULL,
	`weeks` integer,
	`start_date` text,
	`end_date` text,
	`price_per_week` real,
	`currency` text DEFAULT 'GBP' NOT NULL,
	`student_name` text NOT NULL,
	`student_email` text NOT NULL,
	`university` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_created` ON `bookings` (`created_at`);
