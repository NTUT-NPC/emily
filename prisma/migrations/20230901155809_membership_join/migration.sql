-- CreateEnum
CREATE TYPE "RegistrationStep" AS ENUM ('INTRODUCTION', 'BASIC_INFORMATION', 'COMMITTEE_CONFIRMATION', 'COMPLETE');

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "notificationSentAt" TIMESTAMP(3),
    "registrationStep" "RegistrationStep" NOT NULL DEFAULT 'INTRODUCTION',
    "discordId" BIGINT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "studentId" TEXT,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_discordId_key" ON "Member"("discordId");
