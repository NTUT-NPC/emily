import type { CommandInteraction, ContextMenuCommandBuilder, SlashCommandBuilder } from "discord.js";

export interface Command {
  data: Partial<SlashCommandBuilder> | ContextMenuCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}
