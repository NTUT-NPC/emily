CREATE TABLE IF NOT EXISTS "DmConfig" (
	"guild" bigint PRIMARY KEY NOT NULL,
	"parentChannel" bigint NOT NULL,
	"staffRole" bigint NOT NULL,
	"panelMessage" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);