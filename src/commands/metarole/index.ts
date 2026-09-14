import type { Interaction } from "discord.js";
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";
import executeCreateSubcommand from "./create";
import executeListSubcommand from "./list";
import { reconcileMetaroleMembers } from "./memberSync";
import executeRemoveSubcommand from "./remove";
import executeSyncSubcommand from "./sync";
import type { Command } from "#/types";
import { db } from "#drizzle/db";
import { metarole as table } from "#drizzle/schema";

export default {
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
} satisfies Command;

export async function syncMetarole(
  interaction: Interaction,
  metaroleId: bigint,
) {
  if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) {
    return;
  }

  const [metarole] = await db.select({
    memberRoles: table.memberRoles,
    role: table.role,
  })
    .from(table)
    .where(eq(table.role, metaroleId));

  if (!metarole) {
    return;
  }

  const roleId = metarole.role.toString();
  const role = await interaction.guild.roles.fetch(roleId);
  if (!role) {
    throw new Error(`Metarole ${roleId} no longer exists in guild ${interaction.guildId}.`);
  }

  await reconcileMetaroleMembers({
    metaroleId: roleId,
    memberRoleIds: metarole.memberRoles.map((memberRole) => memberRole.toString()),
    fetchMembers: async () => (await interaction.guild.members.fetch()).values(),
    markSynced: async () => {
      await db.update(table)
        .set({ syncedAt: new Date() })
        .where(eq(table.role, metaroleId));
    },
  });
}
