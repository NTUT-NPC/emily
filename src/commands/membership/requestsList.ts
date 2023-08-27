import { RegistrationStep } from "@prisma/client";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";

const executeRequestsList: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply("請在伺服器內使用此指令");
    return;
  }

  const requests = await prisma.member.findMany({
    where: { registrationStep: RegistrationStep.COMMITTEE_CONFIRMATION },
  });

  const requestList = requests.map((request) => {
    const relativeNotificationDate = `<t:${Math.floor(+(request.notificationSentAt ?? Date.now()) / 1000)}:R>`;
    const { discordId, email, name, studentId } = request;
    return `<@${discordId}> ${relativeNotificationDate}: \`${email}\`, \`${name}\`, \`${studentId}\``;
  });

  await interaction.reply(
    `目前有 ${requests.length} 位使用者正在等待幹部確認${requests.length ? "：" : "。"}
${requests.length ? "（`電子郵件`, `姓名`, `學號`）" : ""}
${requestList.join("\n")}`,
  );
};

export default executeRequestsList;
