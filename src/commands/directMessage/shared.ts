import type { ButtonInteraction, GuildMember, Interaction, Role, TextChannel } from "discord.js";
import { PermissionFlagsBits } from "discord.js";

export const createThreadButtonCustomId = "directMessageCreateThread";

export function isCreateThreadButtonInteraction(interaction: Interaction): interaction is ButtonInteraction {
  return interaction.isButton() && interaction.customId === createThreadButtonCustomId;
}

const botPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.ManageThreads,
];

const staffPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.ReadMessageHistory,
];

const memberPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.ReadMessageHistory,
];

export function validateDmConfiguration(
  channel: TextChannel,
  staffRole: Role,
  botMember: GuildMember,
): string | undefined {
  if (channel.guildId !== staffRole.guild.id || channel.guildId !== botMember.guild.id) {
    return "頻道、身份組和機器人必須位於同一個伺服器。";
  }

  if (staffRole.id === channel.guildId) {
    return "不能使用 @everyone 做為幹部身份組。";
  }

  if (staffRole.managed) {
    return "不能使用由整合服務管理的身份組。";
  }

  const botChannelPermissions = channel.permissionsFor(botMember);
  if (!botChannelPermissions.has(botPermissions)) {
    return "機器人在指定頻道缺少查看頻道、傳送訊息、建立私人討論串、在討論串傳送訊息或管理討論串的權限。";
  }

  if (!staffRole.mentionable && !botChannelPermissions.has(PermissionFlagsBits.MentionEveryone)) {
    return "幹部身份組必須允許任何人提及，或機器人必須有提及所有人的權限。";
  }

  if (!channel.permissionsFor(staffRole).has(staffPermissions)) {
    return "幹部身份組在指定頻道缺少查看頻道、在討論串傳送訊息或讀取訊息歷史的權限。";
  }
}

export function validateDmMember(channel: TextChannel, member: GuildMember): string | undefined {
  if (!channel.permissionsFor(member).has(memberPermissions)) {
    return "您在指定頻道缺少查看頻道、在討論串傳送訊息或讀取訊息歷史的權限。";
  }
}
