import { asc, eq } from "drizzle-orm";
import { buildRequestListReply } from "./requestsListPagination";
import { hasManageRolesPermission } from ".";
import type { Subcommand } from "#/types";
import { messages } from "#/config";
import { db } from "#drizzle/db";
import { member as table } from "#drizzle/schema";

const executeRequestsList: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply(messages.error.useInGuild);
    return;
  }

  if (hasManageRolesPermission(interaction)) {
    await interaction.reply("必須有管理身份組的權限");
    return;
  }

  await interaction.deferReply();

  const requests = await db.select({
    id: table.id,
    createdAt: table.createdAt,
    discordId: table.discordId,
    email: table.email,
    name: table.name,
    studentId: table.studentId,
    notificationSentAt: table.notificationSentAt,
  })
    .from(table)
    .where(eq(table.registrationStep, "COMMITTEE_CONFIRMATION"))
    .orderBy(asc(table.createdAt), asc(table.id));

  const requestedPage = interaction.options.getInteger("頁碼") ?? 1;
  await interaction.editReply(buildRequestListReply(requests, requestedPage));
};

export default executeRequestsList;
