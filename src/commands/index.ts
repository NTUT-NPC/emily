import type { ApplicationCommand, MessageComponentInteraction, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction } from "discord.js";
import { ActionRowBuilder, DiscordjsErrorCodes, REST, Routes, TextInputBuilder, TextInputStyle } from "discord.js";
import { messages } from "../config";
import { logger } from "../main";
import type { Command } from "./types";
import convertChannelNameCommand from "./convertChannelName";
import membershipCommand from "./membership";
import metaroleCommand from "./metarole";

const commands = new Map<string, Command>();

commands.set(convertChannelNameCommand.data.name!, convertChannelNameCommand);
commands.set(membershipCommand.data.name!, membershipCommand);
commands.set(metaroleCommand.data.name!, metaroleCommand);

export { commands };

// Returns the number of commands registered.
export async function register() {
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN,
  );

  const body = [];
  for (const command of commands.values()) {
    body.push(command.data.toJSON?.());
  }

  const data = (await rest.put(
    Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID),
    { body },
  )) as ApplicationCommand[];

  return data.length;
}

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

export async function showModalAndGetSubmission(interaction: MessageComponentInteraction, modalBuilder: ModalBuilder): Promise<ModalSubmitInteraction> {
  await interaction.showModal(modalBuilder);
  try {
    const submission = await interaction.awaitModalSubmit({
      time: 3_600_000, // 1 hour
      filter: (i) => i.user.id === interaction.user.id,
    });
    return submission;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    let content = messages.error.generic;
    if (error.name === DiscordjsErrorCodes.InteractionCollectorError) {
      content = messages.error.modalTimeout;
    }
    await interaction.editReply(content);
    logger.error(error);
    throw error;
  }
}
