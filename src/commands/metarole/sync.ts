import type { Subcommand } from "#/types";
import { eq } from "drizzle-orm";
import { db } from "#drizzle/db";
import { metarole as table } from "#drizzle/schema";
import { syncMetarole } from ".";

const executeSyncSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  await interaction.deferReply();

  const metaroles = await db.select({
    role: table.role,
  })
    .from(table)
    .where(eq(table.guild, BigInt(interaction.guildId)));

  for (const { role } of metaroles) {
    await syncMetarole(interaction, role);
  }

  await interaction.editReply("已同步所有身份組群組。");
};

export default executeSyncSubcommand;
