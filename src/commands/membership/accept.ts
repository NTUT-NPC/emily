import type { Guild } from "discord.js";
import { and, eq } from "drizzle-orm";
import { messages } from "#/config";
import { db } from "#drizzle/db";
import { membershipConfig as membershipConfigTable, member as table } from "#/drizzle/schema";

type MembershipAcceptanceResult =
  | { status: "accepted"; directMessageFailed: boolean }
  | { status: "not-found" }
  | { status: "stale" }
  | { status: "configuration-missing" }
  | { status: "resources-missing" }
  | { status: "role-assignment-failed" };

export async function acceptMembershipRequest(
  guild: Guild,
  discordId: bigint,
  expectedRequestRevision?: number,
): Promise<MembershipAcceptanceResult> {
  const [pendingMember] = await db.select()
    .from(table)
    .where(eq(table.discordId, discordId));
  if (!pendingMember) {
    return { status: "not-found" };
  }
  if (
    pendingMember.registrationStep !== "COMMITTEE_CONFIRMATION" ||
    (expectedRequestRevision !== undefined &&
      pendingMember.requestRevision !== expectedRequestRevision)
  ) {
    return { status: "stale" };
  }

  const [membershipConfiguration] = await db.select({
    membershipRole: membershipConfigTable.membershipRole,
  })
    .from(membershipConfigTable)
    .where(eq(membershipConfigTable.guild, BigInt(guild.id)))
    .limit(1);
  if (!membershipConfiguration) {
    return { status: "configuration-missing" };
  }

  const [requester, membershipRole] = await Promise.all([
    guild.members.fetch(discordId.toString()).catch(() => null),
    guild.roles.fetch(membershipConfiguration.membershipRole.toString()).catch(() => null),
  ]);
  if (!requester || !membershipRole) {
    return { status: "resources-missing" };
  }

  const joinedAt = new Date();
  const [acceptedMember] = await db.update(table)
    .set({
      registrationStep: "COMPLETE",
      joinedAt,
    })
    .where(and(
      eq(table.discordId, discordId),
      eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
      eq(table.requestRevision, pendingMember.requestRevision),
    ))
    .returning();
  if (!acceptedMember) {
    return { status: "stale" };
  }

  try {
    await requester.roles.add(membershipRole);
  } catch (error) {
    await db.update(table)
      .set({
        registrationStep: pendingMember.registrationStep,
        joinedAt: pendingMember.joinedAt,
      })
      .where(and(
        eq(table.discordId, discordId),
        eq(table.registrationStep, "COMPLETE"),
        eq(table.joinedAt, joinedAt),
        eq(table.requestRevision, pendingMember.requestRevision),
      ));
    console.error(`Failed to add membership role to ${discordId}.`, error);
    return { status: "role-assignment-failed" };
  }

  let directMessageFailed = false;
  try {
    await requester.send(messages.join.accept);
  } catch (error) {
    directMessageFailed = true;
    console.error(`Failed to notify accepted member ${discordId}.`, error);
  }

  return { status: "accepted", directMessageFailed };
}
