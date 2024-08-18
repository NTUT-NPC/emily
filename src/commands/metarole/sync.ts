import { syncMetarole } from ".";
import type { Subcommand } from "#/types";
import { prisma } from "#main";

const executeSyncSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  await interaction.deferReply();

  const metaroles = await prisma.metarole.findMany({
    where: { guild: BigInt(interaction.guildId) },
  });

  for (const metarole of metaroles) {
    await syncMetarole(interaction, metarole.role.toString());
  }

  await interaction.editReply("已同步所有身份組群組。");
};

export default executeSyncSubcommand;
