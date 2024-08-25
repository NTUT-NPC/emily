import { bigint, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const metarole = pgTable("Metarole", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").default(new Date()).notNull(),
  updatedAt: timestamp("updatedAt").notNull().$onUpdate(() => new Date()),
  syncedAt: timestamp("syncedAt"),
  guild: bigint("guild", { mode: "bigint" }).notNull(),
  role: bigint("role", { mode: "bigint" }).notNull().unique(),
  memberRoles: bigint("memberRoles", { mode: "bigint" }).array().notNull(),
});

export const registrationStep = pgEnum("RegistrationStep", [
  "INTRODUCTION",
  "BASIC_INFORMATION",
  "COMMITTEE_CONFIRMATION",
  "COMPLETE",
]);

export const member = pgTable("Member", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").default(new Date()).notNull(),
  joinedAt: timestamp("joinedAt"),
  notificationSentAt: timestamp("notificationSentAt"),
  registrationStep: registrationStep("registrationStep").default("INTRODUCTION").notNull(),
  discordId: bigint("discordId", { mode: "bigint" }).notNull().unique(),
  name: text("name"),
  email: text("email"),
  studentId: text("studentId"),
});
