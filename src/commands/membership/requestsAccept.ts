import { acceptMembershipRequest } from "./accept";
import { hasManageRolesPermission } from ".";
import { messages } from "#/config";
import type { Subcommand } from "#/types";

const executeRequestsAccept: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply(messages.error.useInGuild);
    return;
  }

  if (hasManageRolesPermission(interaction)) {
    await interaction.reply("必須有管理身份組的權限");
    return;
  }

  const requestUser = interaction.options.getUser("使用者", true);
  const discordId = BigInt(requestUser.id);
  await interaction.deferReply();
  const result = await acceptMembershipRequest(interaction.guild!, discordId);

  switch (result.status) {
    case "accepted":
      await interaction.editReply(
        `已接受 <@${requestUser.id}> 的加入請求。${result.directMessageFailed ? "（無法傳送私訊通知。）" : ""}`,
      );
      return;
    case "not-found":
      await interaction.editReply(messages.error.notInDatabase);
      return;
    case "stale":
      await interaction.editReply("這個使用者並沒有等待幹部確認的加入請求");
      return;
    case "configuration-missing":
      await interaction.editReply(messages.join.configurationMissing);
      return;
    case "resources-missing":
      await interaction.editReply("找不到請求加入者或社員身份組，尚未接受這個加入請求。");
      return;
    case "role-assignment-failed":
      await interaction.editReply("無法分配社員身份組，尚未接受這個加入請求，請稍後再試。");
  }
};

export default executeRequestsAccept;
