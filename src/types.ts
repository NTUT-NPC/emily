import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  SharedSlashCommand,
} from "discord.js";

export interface Command {
  data: SharedSlashCommand | ContextMenuCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export type Subcommand = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;
