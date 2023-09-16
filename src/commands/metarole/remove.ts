import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";

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

  const metaroleEntry = await prisma.metarole.findUnique({
    where: { role: BigInt(metarole.id) },
  });
  if (!metaroleEntry) {
    await interaction.editReply("這個身份組群組不存在");
    return;
  }

  await prisma.metarole.delete({
    where: { role: BigInt(metarole.id) },
  });
  await interaction.editReply({
    content: `已移除 <@&${metarole.id}> 身份組群組。`,
    allowedMentions: { parse: [] }, // 不要提及任何人
  });
};

export default executeRemoveSubcommand;
