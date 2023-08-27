import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";
import { messages } from "../../config.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("轉換頻道名稱")
    .setDescription("繞過 Discord 的小寫和符號限制")
    .addStringOption((option) => option
      .setName("頻道名稱")
      .setDescription("輸入要轉換的頻道名稱")
      .setRequired(true)),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const originalName = interaction.options.getString("頻道名稱");
    if (!originalName) {
      await interaction.reply({ content: messages.error.generic, ephemeral: true });
      return;
    }

    const convertedName = convertChannelName(originalName);
    await interaction.reply(convertedName);
  },
};

export default command;

function convertChannelName(text: string): string {
  const isLowerCase = (s: string) => /^[a-z]*$/.test(s);
  const isUpperCase = (s: string) => /^[A-Z]*$/.test(s);
  const isDigit = (s: string) => /^[0-9]*$/.test(s);
  const isSpace = (s: string) => /^\s*$/.test(s);
  const isVerticalBar = (s: string) => /^\|*$/.test(s);

  let converted = "";
  const uppercaseOffset = 0x1D5D4 - "A".codePointAt(0)!;
  const lowercaseOffset = 0x1D5EE - "a".codePointAt(0)!;
  const digitOffset = 0x1D7EC - "0".codePointAt(0)!;
  for (const c of text) {
    const codePoint = c.codePointAt(0);
    if (!codePoint) {
      converted += c;
    } else if (isUpperCase(c)) {
      converted += String.fromCodePoint(uppercaseOffset + codePoint);
    } else if (isLowerCase(c)) {
      converted += String.fromCodePoint(lowercaseOffset + codePoint);
    } else if (isDigit(c)) {
      converted += String.fromCodePoint(digitOffset + codePoint);
    } else if (isSpace(c)) {
      //
    } else if (isVerticalBar(c)) {
      converted += "｜";
    } else {
      converted += c;
    }
  }
  return converted;
}
