import type { MessageActionRowComponentBuilder } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { eq } from "drizzle-orm";
import { createThreadButtonCustomId, validateDmConfiguration } from "./shared";
import { messages } from "#/config";
import { db } from "#drizzle/db";
import { dmConfig as table } from "#drizzle/schema";
import type { Subcommand } from "#/types";

const manageDmPermission = PermissionFlagsBits.ManageGuild;
const instructionMessage = `# 聯絡幹部

如需聯絡幹部，請按下方按鈕建立私人討論串。討論串建立後，只有您、幹部及具管理討論串權限的管理員可以查看。`;

const executeConfigSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: messages.error.useInGuild, ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  let panelSendFailed = false;

  try {
    await interaction.deferReply({ ephemeral: true });
    const manager = await guild.members.fetch(interaction.user.id);

    if (!manager.permissions.has(manageDmPermission)) {
      await interaction.editReply("必須有管理伺服器的權限。");
      return;
    }

    const selectedChannel = interaction.options.getChannel("頻道", true);
    const selectedRole = interaction.options.getRole("身份組", true);
    const [channel, staffRole, botMember] = await Promise.all([
      guild.channels.fetch(selectedChannel.id),
      guild.roles.fetch(selectedRole.id),
      guild.members.fetchMe(),
    ]);

    if (
      !channel ||
      channel.type !== ChannelType.GuildText ||
      channel.guildId !== interaction.guildId ||
      !staffRole ||
      staffRole.guild.id !== interaction.guildId
    ) {
      await interaction.editReply("請選擇此伺服器中的文字頻道和身份組。");
      return;
    }

    const configurationError = validateDmConfiguration(channel, staffRole, botMember);
    if (configurationError) {
      await interaction.editReply({
        content: configurationError,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const [previousConfig] = await db.select({
      parentChannel: table.parentChannel,
      panelMessage: table.panelMessage,
    })
      .from(table)
      .where(eq(table.guild, BigInt(interaction.guildId)))
      .limit(1);

    const createThreadButton = new ButtonBuilder()
      .setCustomId(createThreadButtonCustomId)
      .setLabel("建立私人討論串")
      .setStyle(ButtonStyle.Primary);
    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(createThreadButton);

    let instructionPanel;
    try {
      instructionPanel = await channel.send({
        content: instructionMessage,
        components: [actionRow],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      panelSendFailed = true;
      throw error;
    }

    try {
      await db.insert(table)
        .values({
          guild: BigInt(interaction.guildId),
          parentChannel: BigInt(channel.id),
          staffRole: BigInt(staffRole.id),
          panelMessage: BigInt(instructionPanel.id),
        })
        .onConflictDoUpdate({
          target: table.guild,
          set: {
            parentChannel: BigInt(channel.id),
            staffRole: BigInt(staffRole.id),
            panelMessage: BigInt(instructionPanel.id),
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      try {
        await instructionPanel.delete();
      } catch (cleanupError) {
        console.error(`Failed to delete unconfigured private contact panel ${instructionPanel.id}.`, cleanupError);
      }
      throw error;
    }

    if (previousConfig) {
      try {
        const previousChannel = await guild.channels.fetch(previousConfig.parentChannel.toString());
        if (previousChannel?.type === ChannelType.GuildText) {
          const previousPanel = await previousChannel.messages.fetch(previousConfig.panelMessage.toString());
          if (previousPanel.author.id === interaction.client.user?.id) {
            await previousPanel.delete();
          }
        }
      } catch (cleanupError) {
        console.error(`Failed to delete previous private contact panel ${previousConfig.panelMessage}.`, cleanupError);
      }
    }
  } catch (error) {
    console.error(`Failed to configure /私訊 設定 in guild ${interaction.guildId}.`, error);
    try {
      const reply = {
        content: panelSendFailed
          ? "無法在指定頻道傳送私訊操作說明，設定未變更。請檢查機器人權限後再試一次。"
          : messages.error.generic,
        allowedMentions: { parse: [] },
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply({ ...reply, ephemeral: true });
      }
    } catch (replyError) {
      console.error("Failed to report /私訊 設定 error to the user.", replyError);
    }
    return;
  }

  try {
    await interaction.editReply({
      content: "已儲存 /私訊 設定，並在指定頻道傳送操作說明。",
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error(`Posted the /私訊 instruction panel, but failed to confirm it to ${interaction.user.id}.`, error);
  }
};

export default executeConfigSubcommand;
