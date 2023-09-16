import { RegistrationStep } from "@prisma/client";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";
import { messages } from "../../config.js";
import { hasManageRolesPermission } from "./index.js";

const executeRequestsReject: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply(messages.error.useInGuild);
    return;
  }

  if (hasManageRolesPermission(interaction)) {
    await interaction.reply("必須有管理身份組的權限");
    return;
  }

  const requester = interaction.options.getUser("使用者", true);
  const reason = interaction.options.getString("原因", true);
  const discordId = BigInt(requester.id);

  const member = await prisma.member.findUnique({ where: { discordId } });
  if (!member) {
    await interaction.reply({ content: messages.error.notInDatabase, ephemeral: true });
    return;
  }
  if (member?.registrationStep !== RegistrationStep.COMMITTEE_CONFIRMATION) {
    await interaction.reply({ content: messages.error.notAwaitingConfirmation, ephemeral: true });
    return;
  }

  await interaction.deferReply();

  await prisma.member.update({
    data: { registrationStep: RegistrationStep.BASIC_INFORMATION },
    where: { discordId },
  });
  await requester.send(messages.join.reject(reason));
  await interaction.editReply(`已拒絕 <@${requester.id}> 的加入請求，理由：${reason}。`);
};

export default executeRequestsReject;
