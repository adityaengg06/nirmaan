CREATE TABLE `artwork` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`business` text NOT NULL,
	`address` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `requests` ADD `quote_amount` integer;--> statement-breakpoint
ALTER TABLE `requests` ADD `quote_accepted_at` text;--> statement-breakpoint
ALTER TABLE `requests` ADD `payment_verified_at` text;