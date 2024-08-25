import { eq } from "drizzle-orm";
import type { Subcommand } from "#/types";
import { db } from "#drizzle/db";
import { metarole as table } from "#drizzle/schema";

const executeRemoveSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  const metarole = interaction.options.getRole("群組");
  if (!metarole) {
    await interaction.reply({ content: "請提供群組", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const metaroleId = BigInt(metarole.id);

  const [metaroleEntry] = await db.select({})
    .from(table)
    .where(eq(table.role, metaroleId));

  if (!metaroleEntry) {
    await interaction.editReply("這個身份組群組不存在");
    return;
  }

  await db.delete(table)
    .where(eq(table.role, metaroleId));

  await interaction.editReply({
    content: `已移除 <@&${metarole.id}> 身份組群組。`,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeRemoveSubcommand;
