import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import executeJoinSubcommand from "./join.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("社員")
    .setDescription("加入社員和管理社員資料")
    .addSubcommand((subcommand) =>
      subcommand.setName("加入").setDescription("加入社員，成為我們的一份子"),
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
    }
  },
};

export default command;
