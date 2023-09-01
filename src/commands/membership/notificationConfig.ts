import { ChannelType, PermissionsBitField } from "discord.js";
import type { Subcommand } from "../types.js";
import { messages } from "../../config.js";

const executeNotificationConfigSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    await interaction.reply(messages.error.useInGuild);
    return;
  }

  if (interaction.memberPermissions.has([
    PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.ManageChannels,
  ])) {
    await interaction.reply("必須有管理身份組和管理頻道的權限");
    return;
  }

  const channel = interaction.options.getChannel("頻道", true)!;
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "請選擇伺服器中的文字頻道。", ephemeral: true });
    return;
  }
  // const role = interaction.options.getRole("身份組", true);

  await interaction.reply({ content: "尚未實作，請直接設定 config.ts。", ephemeral: true });
};

export default executeNotificationConfigSubcommand;
