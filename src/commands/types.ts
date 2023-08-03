import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
} from "discord.js";

export interface Command {
  data: Partial<SlashCommandBuilder> | ContextMenuCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export type Subcommand = (interaction: ChatInputCommandInteraction) => Promise<void>;
