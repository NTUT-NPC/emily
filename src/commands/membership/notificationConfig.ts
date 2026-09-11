import { ChannelType, PermissionsBitField } from "discord.js";
import { messages } from "#/config";
import { db } from "#/drizzle/db";
import { membershipConfig as table } from "#/drizzle/schema";
import type { Subcommand } from "#/types";

const requiredPermissions = [
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageChannels,
];

const executeNotificationConfigSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: messages.error.useInGuild, ephemeral: true });
    return;
  }

  if (!interaction.memberPermissions.has(requiredPermissions)) {
    await interaction.reply({
      content: "必須有管理身份組和管理頻道的權限。",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel("頻道", true);
  const role = interaction.options.getRole("身份組", true);
  if (
    channel.type !== ChannelType.GuildText ||
    channel.guildId !== interaction.guildId ||
    role.guild.id !== interaction.guildId
  ) {
    await interaction.reply({
      content: "請選擇此伺服器中的文字頻道和身份組。",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
    await db.insert(table)
      .values({
        guild: BigInt(interaction.guildId),
        notificationChannel: BigInt(channel.id),
        membershipRole: BigInt(role.id),
      })
      .onConflictDoUpdate({
        target: table.guild,
        set: {
          notificationChannel: BigInt(channel.id),
          membershipRole: BigInt(role.id),
          updatedAt: new Date(),
        },
      });
    await interaction.editReply({
      content: `已儲存社員加入通知設定：通知頻道 <#${channel.id}>，社員身份組 <@&${role.id}>。`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error(`Failed to configure membership notifications in guild ${interaction.guildId}.`, error);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(messages.error.generic);
      } else {
        await interaction.reply({ content: messages.error.generic, ephemeral: true });
      }
    } catch (replyError) {
      console.error("Failed to report membership notification configuration error.", replyError);
    }
  }
};

export default executeNotificationConfigSubcommand;
