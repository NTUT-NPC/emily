import type { ModalActionRowComponentBuilder } from "discord.js";
import { ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

// 製作包含文字輸入的對話框專用 ActionRow
export function makeTextInputActionRow(customId: string, label: string) {
  const textInput = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short);
  const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
  row.addComponents(textInput);
  return row;
}
