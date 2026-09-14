import type { Client, Guild, GuildBasedChannel, TextChannel } from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";

const notificationPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
];

export async function resolveMembershipNotificationChannel(
  client: Client,
  guildId: string,
  channelId: string,
): Promise<TextChannel | undefined> {
  const guild = await client.guilds.fetch(guildId).catch(() => undefined);
  if (!guild) {
    return;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => undefined);
  return validateMembershipNotificationChannel(guild, channel);
}

export function validateMembershipNotificationChannel(
  guild: Guild,
  channel: GuildBasedChannel | null | undefined,
): TextChannel | undefined {
  if (
    !channel ||
    channel.type !== ChannelType.GuildText ||
    channel.guildId !== guild.id
  ) {
    return;
  }

  const botMember = guild.members.me;
  if (!botMember || !channel.permissionsFor(botMember).has(notificationPermissions)) {
    return;
  }

  return channel;
}
