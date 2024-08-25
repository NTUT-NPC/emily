DO $$ BEGIN
 CREATE TYPE "public"."RegistrationStep" AS ENUM('INTRODUCTION', 'BASIC_INFORMATION', 'COMMITTEE_CONFIRMATION', 'COMPLETE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Member" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT '2024-08-25 13:29:15.983' NOT NULL,
	"joinedAt" timestamp,
	"notificationSentAt" timestamp,
	"registrationStep" "RegistrationStep" DEFAULT 'INTRODUCTION' NOT NULL,
	"discordId" bigint NOT NULL,
	"name" text,
	"email" text,
	"studentId" text,
	CONSTRAINT "Member_discordId_unique" UNIQUE("discordId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Metarole" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT '2024-08-25 13:29:15.983' NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"syncedAt" timestamp,
	"guild" bigint NOT NULL,
	"role" bigint NOT NULL,
	"memberRoles" bigint[] NOT NULL,
	CONSTRAINT "Metarole_role_unique" UNIQUE("role")
);
