CREATE TABLE `alert_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleId` int,
	`title` varchar(180) NOT NULL,
	`source` varchar(100) NOT NULL,
	`category` varchar(40) NOT NULL,
	`severity` varchar(20) NOT NULL,
	`sourceUrl` text,
	`observedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(40) NOT NULL,
	`severity` enum('low','moderate','high') NOT NULL DEFAULT 'moderate',
	`region` varchar(120) DEFAULT 'Global',
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followed_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`region` varchar(120) NOT NULL,
	`geometry` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `followed_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`visibleLayers` text NOT NULL,
	`defaultRegion` varchar(80) DEFAULT 'Global',
	`theme` varchar(20) DEFAULT 'dark',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_preferences_id` PRIMARY KEY(`id`)
);
