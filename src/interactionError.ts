import type { Interaction } from "discord.js";
import { MessageFlags } from "discord.js";
import { messages } from "#config";

type ErrorLogger = (message: string, ...errors: unknown[]) => void;

export async function handleInteractionError(
  interaction: Interaction,
  error: unknown,
  logError: ErrorLogger = console.error,
): Promise<void> {
  let responseError: unknown;
  if (interaction.isRepliable()) {
    try {
      if (interaction.deferred) {
        await interaction.editReply(messages.error.generic);
      } else if (interaction.replied) {
        await interaction.followUp({
          content: messages.error.generic,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: messages.error.generic,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (responseFailure) {
      responseError = responseFailure;
    }
  }

  try {
    if (responseError) {
      logError("Failed to handle an interaction and report the error.", error, responseError);
    } else {
      logError("Failed to handle an interaction.", error);
    }
  } catch {
    // Error reporting must not create another unhandled rejection.
  }
}
