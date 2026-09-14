CREATE TABLE IF NOT EXISTS "DmThread" (
	"guild" bigint NOT NULL,
	"userId" bigint NOT NULL,
	"thread" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DmThread_guild_userId_pk" PRIMARY KEY("guild","userId")
);