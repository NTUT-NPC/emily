import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type { ApplicationCommand, MessageComponentInteraction, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction } from "discord.js";
import { ActionRowBuilder, DiscordjsErrorCodes, REST, Routes, TextInputBuilder, TextInputStyle } from "discord.js";
import { messages } from "../config.js";
import { logger } from "../main.js";
import type { Command } from "./types.js";

export async function getCommands() {
  const commands = new Map<string, Command>();
  const commandDirUrl = new URL(".", import.meta.url);
  const commandFiles = await readdir(commandDirUrl);

  for (const file of commandFiles) {
    if (file.startsWith("index") || file.startsWith("types")) {
      continue;
    }

    const module = new URL(join(file, "index.js"), commandDirUrl).toString();
    const { default: command } = (await import(module)) as { default: Command };
    commands.set(command.data.name!, command);
  }

  return commands;
}

// Returns the number of commands registered.
export async function register() {
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN,
  );

  const body = [];
  const commands = await getCommands();
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
