import { getCommands, register } from "./commands/index.js";
import config from "./config.js";
import { PrismaClient } from "@prisma/client";
import { Client, Events, GatewayIntentBits } from "discord.js";

export const prisma = new PrismaClient();

(async () => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  const commands = await getCommands();
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    await command.execute(interaction);
  });

  if (config.registerCommands) {
    const commandCount = await register();
    console.log(`Registered ${commandCount} commands.`);
  }

  client.login(process.env.DISCORD_BOT_TOKEN);
})();
