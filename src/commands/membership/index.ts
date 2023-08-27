import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import executeJoinSubcommand from "./join.js";
import executeNotificationConfigSubcommand from "./notificationConfig.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("社員")
    .setDescription("加入社員和管理社員資料")
    .addSubcommand((subcommand) =>
      subcommand.setName("加入").setDescription("加入社員，成為我們的一份子"),
    )
    .addSubcommand((subcommand) => subcommand
      .setName("設定通知")
      .setDescription("設定社員加入請求的通知")
      .addChannelOption((option) => option
        .setName("頻道")
        .setDescription("傳送通知的頻道")
        .setRequired(true),
      )
      .addRoleOption((option) => option
        .setName("身份組")
        .setDescription("可以接收通知的身份組"),
      ),
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "加入":
        await executeJoinSubcommand(interaction);
        break;
      case "設定通知頻道":
        await executeNotificationConfigSubcommand(interaction);
        break;
    }
  },
};

export default command;
