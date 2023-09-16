import { MessageMentions } from "discord.js";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";
import { syncMetarole } from "./index.js";

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

  const metaroleId = metarole.id;
  const memberRoleIds = [...memberRoles].map((match) => match[1]!);

  const existingMetarole = await prisma.metarole.findUnique({
    where: { role: BigInt(metaroleId) },
  });
  if (existingMetarole) {
    await interaction.reply({
      content: "這個身份組群組已經存在",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  await prisma.metarole.create({
    data: {
      guild: BigInt(interaction.guildId),
      role: BigInt(metaroleId),
      memberRoles: memberRoleIds.map((id) => BigInt(id)),
    },
  });

  await syncMetarole(interaction, metaroleId);

  await interaction.editReply({
    content: `已建立 <@&${metaroleId}> 身份組群組。`,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeCreateSubcommand;
