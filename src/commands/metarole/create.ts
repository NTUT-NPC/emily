import { MessageMentions } from "discord.js";
import { prisma } from "../../main.js";
import { syncMetarole } from "./index.js";
import { Subcommand } from "../types.js";

const executeCreateSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) return;
  
  const metarole = interaction.options.getRole("群組");

  const globalRolesPattern = new RegExp(MessageMentions.RolesPattern, "g");
  const memberRoles = interaction.options
    .getString("成員")
    ?.matchAll(globalRolesPattern);

  if (!metarole || !memberRoles) {
    interaction.reply({ content: "請提供群組和成員", ephemeral: true });
    return;
  }

  const metaroleId = metarole.id;
  const memberRoleIds = [...memberRoles].map((match) => match[1]!);

  const existingMetarole = await prisma.metarole.findUnique({
    where: { role: BigInt(metaroleId) },
  });
  if (existingMetarole) {
    interaction.reply({
      content: "這個身份組群組已經存在",
      ephemeral: true,
    });
    return;
  }

  await prisma.metarole.create({
    data: {
      guild: BigInt(interaction.guildId),
      role: BigInt(metaroleId),
      memberRoles: memberRoleIds.map((id) => BigInt(id)),
    },
  });

  syncMetarole(interaction, metaroleId);

  interaction.reply({
    content: `已建立 <@&${metaroleId}> 身份組群組。`,
    ephemeral: true,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeCreateSubcommand;
