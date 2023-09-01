import { RegistrationStep } from "@prisma/client";
import config, { messages } from "../../config.js";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";
import { hasManageRolesPermission } from "./index.js";

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

  const member = await prisma.member.findUnique({ where: { discordId } });
  if (!member) {
    await interaction.reply(messages.error.generic);
    return;
  }
  if (member.registrationStep !== RegistrationStep.COMMITTEE_CONFIRMATION) {
    await interaction.reply("這個使用者並沒有等待幹部確認的加入請求");
    return;
  }

  await prisma.member.update({
    data: { registrationStep: RegistrationStep.COMPLETE },
    where: { discordId },
  });
  const membershipRole = interaction.guild!.roles.cache.get(config.membershipRoleId)!;
  await requester.roles.add(membershipRole);
  await requester.send(messages.join.accept);
  await interaction.reply(`已接受 <@${requester.id}> 的加入請求。`);
};

export default executeRequestsAccept;
