import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";
import { syncMetarole } from "./index.js";

const executeSyncSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  const metaroles = await prisma.metarole.findMany({
    where: { guild: BigInt(interaction.guildId) },
  });

  for (const metarole of metaroles) {
    await syncMetarole(interaction, metarole.role.toString());
  }

  await interaction.reply({
    content: "已同步所有身份組群組。",
    ephemeral: true,
  });
};

export default executeSyncSubcommand;
