import { MessageMentions, SlashCommandBuilder } from "discord.js";
import type { Command } from "./types";
import { prisma } from "../main";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("身份組群組")
    .setDescription("製作和管理身份組群組")
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
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "建立": {
        const metarole = interaction.options.getRole("群組");

        const globalRolesPattern = new RegExp(
          MessageMentions.RolesPattern,
          "g",
        );
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
          where: { group: BigInt(metaroleId) },
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
            group: BigInt(metaroleId),
            memberRoles: memberRoleIds.map((id) => BigInt(id)),
          },
        });

        syncMetarole(metaroleId);

        interaction.reply({
          content: `已建立 <@&${metaroleId}> 身份組群組。`,
          ephemeral: true,
          allowedMentions: { parse: [] }, // 不要提及任何人
        });

        break;
      }

      case "移除": {
        const metarole = interaction.options.getRole("群組");
        if (!metarole) {
          interaction.reply({ content: "請提供群組", ephemeral: true });
          return;
        }

        const metaroleEntry = await prisma.metarole.findUnique({
          where: { group: BigInt(metarole.id) },
        });
        if (!metaroleEntry) {
          interaction.reply({
            content: "這個身份組群組不存在",
            ephemeral: true,
          });
          return;
        }

        await prisma.metarole.delete({
          where: { group: BigInt(metarole.id) },
        });
        interaction.reply({
          content: `已移除 <@&${metarole.id}> 身份組群組。`,
          ephemeral: true,
          allowedMentions: { parse: [] }, // 不要提及任何人
        });

        break;
      }

      case "同步": {
        const metaroles = await prisma.metarole.findMany({
          where: { guild: BigInt(interaction.guildId) },
        });

        for (const metarole of metaroles) {
          syncMetarole(metarole.group.toString());
        }

        interaction.reply({
          content: "已同步所有身份組群組。",
          ephemeral: true,
        });

        break;
      }

      case "列表": {
        const metaroles = await prisma.metarole.findMany({
          where: { guild: BigInt(interaction.guildId) },
        });

        if (metaroles.length == 0) {
          interaction.reply({
            content: "沒有身份組群組。",
            ephemeral: true,
          });
          return;
        }

        const replyContent = ["身份組群組列表：\n"];
        const roles = interaction.guild?.roles.cache;
        for (const m of metaroles) {
          const memberRoles = m.memberRoles.map((r) => `<@&${r}>`).join(", ");
          const metaroleSize = roles?.get(m.group.toString())?.members.size;

          replyContent.push(
            `<@&${m.group}>：包含 ${memberRoles}，共 ${metaroleSize} 位成員\n`,
          );
        }

        interaction.reply({
          content: replyContent.join(""),
          ephemeral: true,
          allowedMentions: { parse: [] },
        });

        break;
      }
    }

    async function syncMetarole(metaroleId: string) {
      const metarole = await prisma.metarole.findUnique({
        where: { group: BigInt(metaroleId) },
      });
      if (!metarole) return;

      for (const memberRole of metarole.memberRoles) {
        const role = interaction.guild?.roles.cache.get(memberRole.toString());
        if (!role) continue;
        console.log(role.name, role.members.keys());

        for (const member of role.members.values()) {
          member.roles.add(metarole.group.toString());
        }
      }

      await prisma.metarole.update({
        where: { group: BigInt(metaroleId) },
        data: { syncedAt: new Date() },
      });
    }
  },
};

export default command;
