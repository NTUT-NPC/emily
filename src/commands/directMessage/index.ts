import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import executeConfigSubcommand from "./config";
import type { Command } from "#/types";

const command = {
  data: new SlashCommandBuilder()
    .setName("私訊")
    .setDescription("設定與幹部聯絡的私人討論串")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand
      .setName("設定")
      .setDescription("設定建立私人討論串的頻道和幹部身份組")
      .addChannelOption((option) => option
        .setName("頻道")
        .setDescription("建立私人討論串的文字頻道")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
      )
      .addRoleOption((option) => option
        .setName("身份組")
        .setDescription("要通知的幹部身份組")
        .setRequired(true),
      ),
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "設定":
        await executeConfigSubcommand(interaction);
        break;
    }
  },
} satisfies Command;

export default command;
