import { Client, Events, GatewayIntentBits } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { commands, register } from "./commands";
import config from "./config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = (await commands).get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  await command.execute(interaction);
});

if (config.registerCommands) {
  (async () => {
    const commandCount = await register();
    console.log(`Registered ${commandCount} commands.`);
  })();
}

client.login(process.env.DISCORD_BOT_TOKEN);

export const prisma = new PrismaClient();
