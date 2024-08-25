import { MessageMentions } from "discord.js";
import { eq } from "drizzle-orm";
import { syncMetarole } from ".";
import type { Subcommand } from "#types";
import { db } from "#drizzle/db";
import { metarole as table } from "#drizzle/schema";

const executeCreateSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) {
    return;
  }

  const metarole = interaction.options.getRole("群組");

  const globalRolesPattern = new RegExp(MessageMentions.RolesPattern, "g");
  const memberRoles = interaction.options
    .getString("成員")
    ?.matchAll(globalRolesPattern);

  if (!metarole || !memberRoles) {
    await interaction.reply({ content: "請提供群組和成員", ephemeral: true });
    return;
  }

  const metaroleId = BigInt(metarole.id);
  const memberRoleIds = [...memberRoles].map((match) => match[1]!);

  const [metaroleEntry] = await db.select({})
    .from(table)
    .where(eq(table.role, metaroleId));

  if (metaroleEntry) {
    await interaction.reply({
      content: "這個身份組群組已經存在",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  await db.insert(table).values({
    guild: BigInt(interaction.guildId),
    role: metaroleId,
    memberRoles: memberRoleIds.map((id) => BigInt(id)),
  });

  await syncMetarole(interaction, metaroleId);

  await interaction.editReply({
    content: `已建立 <@&${metaroleId}> 身份組群組。`,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeCreateSubcommand;
