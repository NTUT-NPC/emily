import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import type { ApplicationCommand } from "discord.js";
import { REST, Routes } from "discord.js";
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
