import type { ButtonInteraction, ThreadChannel } from "discord.js";
import {
  ChannelType,
  MessageFlags,
  ThreadAutoArchiveDuration,
  channelMention,
  roleMention,
  userMention,
} from "discord.js";
import { and, eq, sql } from "drizzle-orm";
import { validateDmConfiguration, validateDmMember } from "./shared";
import { messages } from "#/config";
import { db } from "#drizzle/db";
import { dmConfig as table, dmThread as threadTable } from "#drizzle/schema";

const staffMentionError = "無法通知幹部，請聯絡伺服器管理員檢查 /私訊 設定。";
export default async function executeCreateThreadButton(interaction: ButtonInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: messages.error.useInGuild, ephemeral: true });
    return;
  }

  const guild = interaction.guild;

  let thread: ThreadChannel | undefined;
  let threadCreated = false;
  let reusedThread = false;
  let staffMentionFailed = false;
  try {
    await interaction.deferReply({ ephemeral: true });
    await db.transaction(async (tx) => {
      const lockKey = `${interaction.guildId}:${interaction.user.id}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

      const [settings] = await tx.select({
        parentChannel: table.parentChannel,
        staffRole: table.staffRole,
        panelMessage: table.panelMessage,
      })
        .from(table)
        .where(eq(table.guild, BigInt(interaction.guildId)))
        .limit(1);

      if (!settings) {
        await interaction.editReply("此伺服器尚未設定私訊頻道，請聯絡伺服器管理員。");
        return;
      }

      if (
        settings.parentChannel.toString() !== interaction.channelId ||
        settings.panelMessage.toString() !== interaction.message.id ||
        interaction.message.author.id !== interaction.client.user?.id
      ) {
        await interaction.editReply("此私訊按鈕已失效，請使用目前私訊頻道中的按鈕。");
        return;
      }

      const [channel, staffRole, botMember, member] = await Promise.all([
        guild.channels.fetch(settings.parentChannel.toString()),
        guild.roles.fetch(settings.staffRole.toString()),
        guild.members.fetchMe(),
        guild.members.fetch(interaction.user.id),
      ]);

      if (!channel || channel.type !== ChannelType.GuildText || !staffRole) {
        await interaction.editReply("私訊設定已失效，請聯絡伺服器管理員重新設定。");
        return;
      }

      const configurationError = validateDmConfiguration(channel, staffRole, botMember);
      if (configurationError) {
        console.error(`Invalid /私訊 設定 for guild ${interaction.guildId}: ${configurationError}`);
        await interaction.editReply("私訊設定已失效，請聯絡伺服器管理員重新設定。");
        return;
      }

      const memberError = validateDmMember(channel, member);
      if (memberError) {
        await interaction.editReply(memberError);
        return;
      }

      const notifyThread = async (targetThread: ThreadChannel) => {
        const notification = await targetThread.send({
          content: `${userMention(interaction.user.id)} ${roleMention(staffRole.id)}`,
          allowedMentions: {
            parse: [],
            users: [interaction.user.id],
            roles: [staffRole.id],
          },
        });
        if (notification.flags.has(MessageFlags.FailedToMentionSomeRolesInThread)) {
          staffMentionFailed = true;
          throw new Error("Discord could not add every mentioned staff member to the private thread.");
        }
      };

      const [savedThread] = await tx.select({
        thread: threadTable.thread,
      })
        .from(threadTable)
        .where(and(
          eq(threadTable.guild, BigInt(interaction.guildId)),
          eq(threadTable.userId, BigInt(interaction.user.id)),
        ))
        .limit(1);

      if (savedThread) {
        const existingChannel = await guild.channels.fetch(savedThread.thread.toString()).catch(() => null);
        if (
          existingChannel?.isThread() &&
          existingChannel.type === ChannelType.PrivateThread &&
          existingChannel.parentId === channel.id
        ) {
          thread = existingChannel as ThreadChannel;
          if (thread.locked) {
            await thread.setLocked(false, "重新開啟私人聯絡討論串");
          }
          if (thread.archived) {
            await thread.setArchived(false, "重新開啟私人聯絡討論串");
          }
          await thread.members.add(interaction.user.id, "重新加入私人聯絡討論串");
          await notifyThread(thread);
          await tx.update(threadTable)
            .set({ updatedAt: new Date() })
            .where(and(
              eq(threadTable.guild, BigInt(interaction.guildId)),
              eq(threadTable.userId, BigInt(interaction.user.id)),
            ));
          reusedThread = true;
          return;
        }

        await tx.delete(threadTable)
          .where(and(
            eq(threadTable.guild, BigInt(interaction.guildId)),
            eq(threadTable.userId, BigInt(interaction.user.id)),
          ));
      }

      const threadName = member.nickname ?? interaction.user.globalName ?? interaction.user.username;
      thread = await channel.threads.create({
        name: `私訊-${threadName}`.slice(0, 100),
        type: ChannelType.PrivateThread,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        invitable: false,
        reason: `${interaction.user.tag} (${interaction.user.id}) 點擊私訊按鈕`,
      });
      threadCreated = true;

      await tx.insert(threadTable)
        .values({
          guild: BigInt(interaction.guildId),
          userId: BigInt(interaction.user.id),
          thread: BigInt(thread.id),
        })
        .onConflictDoUpdate({
          target: [threadTable.guild, threadTable.userId],
          set: {
            thread: BigInt(thread.id),
            updatedAt: new Date(),
          },
        });
      await thread.members.add(interaction.user.id, "加入私訊按鈕使用者");
      await notifyThread(thread);
    });
  } catch (error) {
    console.error(`Failed to create a private contact thread for ${interaction.user.id} in guild ${interaction.guildId}.`, error);

    if (thread && threadCreated) {
      try {
        await thread.delete("清理未完成的私人聯絡討論串");
      } catch (cleanupError) {
        console.error(`Failed to delete incomplete private contact thread ${thread.id}.`, cleanupError);
      }
    }

    try {
      const reply = {
        content: staffMentionFailed ? staffMentionError : messages.error.generic,
        allowedMentions: { parse: [] },
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply({ ...reply, ephemeral: true });
      }
    } catch (replyError) {
      console.error("Failed to report a private contact thread error to the user.", replyError);
    }
    return;
  }

  if (!thread) {
    return;
  }

  try {
    await interaction.editReply(
      `${reusedThread ? "已重新開啟私人討論串" : "已建立私人討論串"}：${channelMention(thread.id)}`,
    );
  } catch (error) {
    console.error(`Created private contact thread ${thread.id}, but failed to confirm it to ${interaction.user.id}.`, error);
  }
}
