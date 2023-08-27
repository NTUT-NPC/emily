import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import executeJoinSubcommand from "./join.js";
import executeNotificationConfigSubcommand from "./notificationConfig.js";
import executeRequestsList from "./requestsList.js";
import executeRequestsAccept from "./requestsAccept.js";
import executeRequestsReject from "./requestsReject.js";

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
    )
    .addSubcommandGroup((subcommandGroup) => subcommandGroup
      .setName("請求")
      .setDescription("管理社員加入請求")
      .addSubcommand((subcommand) => subcommand
        .setName("查看")
        .setDescription("查看正在等待幹部確認的請求"),
      )
      .addSubcommand((subcommand) => subcommand
        .setName("接受")
        .setDescription("接受請求")
        .addUserOption((option) => option
          .setName("使用者")
          .setDescription("要接受的使用者")
          .setRequired(true),
        ),
      )
      .addSubcommand((subcommand) => subcommand
        .setName("拒絕")
        .setDescription("拒絕請求")
        .addUserOption((option) => option
          .setName("使用者")
          .setDescription("要拒絕的使用者")
          .setRequired(true),
        )
        .addStringOption((option) => option
          .setName("原因")
          .setDescription("完整的拒絕理由，這會傳送給請求加入者。他會回到「填寫基本資料」步驟。")
          .setRequired(true),
        ),
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
      case "查看":
        await executeRequestsList(interaction);
        break;
      case "接受":
        await executeRequestsAccept(interaction);
        break;
      case "拒絕":
        await executeRequestsReject(interaction);
        break;
    }
  },
};

export default command;
