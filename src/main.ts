import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { Client, Events, GatewayIntentBits } from "discord.js";
import pino from "pino";
import { getCommands, register } from "./commands/index.js";
import config from "./config.js";

export const prisma = new PrismaClient();
export const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});

void (async () => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Ready! Logged in as ${c.user.tag}`);
  });

  const commands = await getCommands();
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }

    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    await command.execute(interaction);
  });

  if (config.registerCommands) {
    const commandCount = await register();
    logger.info(`Registered ${commandCount} commands.`);
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);
})();
