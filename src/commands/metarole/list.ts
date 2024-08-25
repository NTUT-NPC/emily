import { eq } from "drizzle-orm";
import type { Subcommand } from "#/types";
import { db } from "#drizzle/db";
import { metarole as table } from "#drizzle/schema";

const executeListSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  await interaction.deferReply();

  const metaroles = await db.select({
    memberRoles: table.memberRoles,
    role: table.role,
    syncedAt: table.syncedAt,
  })
    .from(table)
    .where(eq(table.guild, BigInt(interaction.guildId)));

  if (metaroles.length === 0) {
    await interaction.editReply("沒有身份組群組。");
    return;
  }

  const replyContent = ["身份組群組列表：\n"];
  const roles = interaction.guild?.roles.cache;
  for (const m of metaroles) {
    const memberRoles = m.memberRoles.map((r) => `<@&${r}>`).join(", ");
    const metaroleSize = roles?.get(m.role.toString())?.members.size;
    const syncTimestamp = m.syncedAt
      ? Math.floor(m.syncedAt.getTime() / 1000)
      : null;
    const syncStatusMessage = syncTimestamp
      ? `<t:${syncTimestamp}:R>同步過`
      : "尚未同步";

    replyContent.push(
      `<@&${m.role}>：包含 ${memberRoles}，共 ${metaroleSize} 位成員，${syncStatusMessage}。\n`,
    );
  }

  await interaction.editReply({
    content: replyContent.join(""),
    allowedMentions: { parse: [] },
  });
};

export default executeListSubcommand;
