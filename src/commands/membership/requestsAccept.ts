import { eq } from "drizzle-orm";
import { hasManageRolesPermission } from ".";
import config, { messages } from "#/config";
import type { Subcommand } from "#/types";
import { db } from "#drizzle/db";
import { member as table } from "#drizzle/schema";

const executeRequestsAccept: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply(messages.error.useInGuild);
    return;
  }

  if (hasManageRolesPermission(interaction)) {
    await interaction.reply("必須有管理身份組的權限");
    return;
  }

  // requestUser is a User, but we need a GuildMember to add the role.
  // Find the GuildMember by the User's ID.
  const requestUser = interaction.options.getUser("使用者", true);
  const requester = interaction.guild!.members.cache.get(requestUser.id)!;
  const discordId = BigInt(requester.id);

  const [member] = await db.select()
    .from(table)
    .where(eq(table.discordId, discordId));

  if (!member) {
    await interaction.reply({ content: messages.error.notInDatabase, ephemeral: true });
    return;
  }

  if (member.registrationStep !== "COMMITTEE_CONFIRMATION") {
    await interaction.reply("這個使用者並沒有等待幹部確認的加入請求");
    return;
  }

  await interaction.deferReply();

  await db.update(table)
    .set({
      registrationStep: "COMPLETE",
      joinedAt: new Date(),
    })
    .where(eq(table.discordId, discordId));

  const membershipRole = interaction.guild!.roles.cache.get(config.membershipRoleId)!;
  await requester.roles.add(membershipRole);
  await requester.send(messages.join.accept);
  await interaction.editReply(`已接受 <@${requester.id}> 的加入請求。`);
};

export default executeRequestsAccept;
