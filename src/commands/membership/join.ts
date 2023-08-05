import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
} from "discord.js";
import config from "../../config.js";
import { prisma } from "../../main.js";
import { Subcommand } from "../types.js";

const executeJoinSubcommand: Subcommand = async (interaction) => {
  // 條款 -> 基本資料 -> 付費 -> 幹部確認 -> 成功
  if (interaction.inGuild()) {
    await interaction.reply({
      content: "很高興您願意加入我們！建議您私訊我以確保您的隱私喔！",
      ephemeral: true,
    });
    return;
  }

  const id = BigInt(interaction.user.id);

  // 查詢加入進度，如果沒有就建立一個
  const member = await prisma.member.upsert({
    create: { discordId: id },
    update: {},
    where: { discordId: id },
  });

  switch (member.registrationStep) {
    case "TERMS_AND_CONDITIONS": {

    case "BASIC_INFORMATION":

    case "PAYMENT":

    case "COMPLETE":
      break;

    default:
      await interaction.reply({
        content: config.defaultErrorMessage,
        ephemeral: true,
      });
      break;
  }
};

export default executeJoinSubcommand;
