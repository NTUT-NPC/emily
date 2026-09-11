import type { ApplicationCommand } from "discord.js";
import { REST, Routes } from "discord.js";
import convertChannelNameCommand from "./convertChannelName";
import directMessageCommand from "./directMessage";
import membershipCommand from "./membership";
import metaroleCommand from "./metarole";
import type { Command } from "#types";

const commands = new Map<string, Command>();

commands.set(convertChannelNameCommand.data.name!, convertChannelNameCommand);
commands.set(directMessageCommand.data.name!, directMessageCommand);
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
