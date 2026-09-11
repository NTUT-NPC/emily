import type { Interaction } from "discord.js";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { commands, register } from "#commands";
import executeCreateThreadButton from "#commands/directMessage/createThread";
import { isCreateThreadButtonInteraction } from "#commands/directMessage/shared";
import {
  executeApplicantJoinInteraction,
  executeJoinNotificationInteraction,
  isApplicantJoinInteraction,
  isJoinNotificationInteraction,
} from "#commands/membership/join";
import config from "#config";
import { handleInteractionError } from "#interactionError";

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void dispatchInteraction(interaction).catch((error) => {
      void handleInteractionError(interaction, error);
    });
  });

  if (config.registerCommands) {
    const commandCount = await register();
    console.log(`Registered ${commandCount} commands.`);
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

async function dispatchInteraction(interaction: Interaction) {
  if (isCreateThreadButtonInteraction(interaction)) {
    await executeCreateThreadButton(interaction);
    return;
  }
  if (isApplicantJoinInteraction(interaction)) {
    await executeApplicantJoinInteraction(interaction);
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
}

void main().catch((error) => {
  console.error("Failed to start Emily.", error);
});
