import type { Interaction } from "discord.js";
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { prisma } from "../../main.js";
import type { Command } from "../types.js";
import executeCreateSubcommand from "./create.js";
import executeListSubcommand from "./list.js";
import executeRemoveSubcommand from "./remove.js";
import executeSyncSubcommand from "./sync.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("身份組群組")
    .setDescription("製作和管理身份組群組")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("建立")
        .setDescription("建立一個身份組群組")
        .addRoleOption((option) =>
          option
            .setName("群組")
            .setDescription("選擇做為群組的身份組")
            .setRequired(true),
        )
        // 不能多選身份組： https://stackoverflow.com/a/70915770/11631322
        .addStringOption((option) =>
          option
            .setName("成員")
            .setDescription("提及 (@) 所有要加入群組的身份組")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("移除")
        .setDescription("移除一個身份組群組")
        .addRoleOption((option) =>
          option
            .setName("群組")
            .setDescription("選擇要移除的身份組群組")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("同步").setDescription("同步所有身份組群組"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("列表").setDescription("列出所有身份組群組"),
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "建立":
        await executeCreateSubcommand(interaction);
        break;

      case "移除":
        await executeRemoveSubcommand(interaction);
        break;

      case "同步":
        await executeSyncSubcommand(interaction);
        break;

      case "列表":
        await executeListSubcommand(interaction);
        break;
    }
  },
};

export async function syncMetarole(
  interaction: Interaction,
  metaroleId: string,
) {
  if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
    return;
  }

  const metarole = await prisma.metarole.findUnique({
    where: { role: BigInt(metaroleId) },
  });
  if (!metarole) {
    return;
  }

  for (const memberRole of metarole.memberRoles) {
    const role = interaction.guild?.roles.cache.get(memberRole.toString());
    if (!role) {
      continue;
    }

    for (const member of role.members.values()) {
      await member.roles.add(metarole.role.toString());
    }
  }

  await prisma.metarole.update({
    where: { role: BigInt(metaroleId) },
    data: { syncedAt: new Date() },
  });
}

export default command;
