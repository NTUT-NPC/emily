import { Client, Events, GatewayIntentBits } from "discord.js";
import { commands, register } from "#commands";
import executeCreateThreadButton from "#commands/directMessage/createThread";
import { isCreateThreadButtonInteraction } from "#commands/directMessage/shared";
import { executeJoinNotificationInteraction, isJoinNotificationInteraction } from "#commands/membership/join";
import config from "#config";

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (isCreateThreadButtonInteraction(interaction)) {
      await executeCreateThreadButton(interaction);
      return;
    }
    if (isJoinNotificationInteraction(interaction)) {
      await executeJoinNotificationInteraction(interaction);
      return;
    }

    if (!interaction.isCommand()) {
      return;
    }

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    await command.execute(interaction);
  });

  if (config.registerCommands) {
    const commandCount = await register();
    console.log(`Registered ${commandCount} commands.`);
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main();
