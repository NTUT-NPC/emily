CREATE TABLE IF NOT EXISTS "MembershipConfig" (
	"guild" bigint PRIMARY KEY NOT NULL,
	"notificationChannel" bigint NOT NULL,
	"membershipRole" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
