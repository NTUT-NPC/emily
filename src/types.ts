import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  SharedSlashCommand,
} from "discord.js";
import type { member, metarole } from "#drizzle/schema";

export interface Command {
  data: SharedSlashCommand | ContextMenuCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export type Subcommand = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export type Member = typeof member.$inferSelect;
export type Metarole = typeof metarole.$inferSelect;
