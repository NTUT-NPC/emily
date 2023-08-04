import { prisma } from "../../main.js";
import { Subcommand } from "../types.js";

const executeRemoveSubcommand: Subcommand = async (interaction) => {
  if (!interaction.inGuild()) return;

  const metarole = interaction.options.getRole("群組");
  if (!metarole) {
    interaction.reply({ content: "請提供群組", ephemeral: true });
    return;
  }

  const metaroleEntry = await prisma.metarole.findUnique({
    where: { role: BigInt(metarole.id) },
  });
  if (!metaroleEntry) {
    interaction.reply({
      content: "這個身份組群組不存在",
      ephemeral: true,
    });
    return;
  }

  await prisma.metarole.delete({
    where: { role: BigInt(metarole.id) },
  });
  interaction.reply({
    content: `已移除 <@&${metarole.id}> 身份組群組。`,
    ephemeral: true,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeRemoveSubcommand;
