CREATE TABLE `student_records` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`issuer_id` text NOT NULL,
	`student_email` text NOT NULL,
	`name` text NOT NULL,
	`student_id` text NOT NULL,
	`class_name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
