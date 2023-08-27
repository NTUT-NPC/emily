import { ChannelType, PermissionsBitField } from "discord.js";
import type { Subcommand } from "../types.js";

const executeNotificationConfigSubcommand: Subcommand = async (interaction) => {
  await interaction.reply("尚未實作");
  if (!interaction.inGuild()) {
    await interaction.reply("請在伺服器內使用此指令");
    return;
  }

  if (interaction.memberPermissions.has([
    PermissionsBitField.Flags.ManageRoles, PermissionsBitField.Flags.ManageChannels,
  ])) {
    await interaction.reply("必須有管理身份組和管理頻道的權限");
    return;
  }

  const channel = interaction.options.getChannel("頻道")!;
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "請選擇伺服器中的文字頻道。", ephemeral: true });
    return;
  }
  const role = interaction.options.getRole("身份組");

  await interaction.reply({ content: "尚未實作，請直接設定 config.ts。", ephemeral: true });
};

export default executeNotificationConfigSubcommand;
