CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`challenge` integer NOT NULL,
	`seed` integer NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`concepts` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_owner_created` ON `attempts` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `projects` (
	`owner` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated` integer NOT NULL
);
