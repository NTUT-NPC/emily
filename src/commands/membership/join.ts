import type { RegistrationStep } from "@prisma/client";
import type { InteractionReplyOptions, MessageActionRowComponentBuilder, MessageEditOptions, ModalActionRowComponentBuilder } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordjsErrorCodes, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { messages } from "../../config.js";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";

const executeJoinSubcommand: Subcommand = async (interaction) => {
  // 簡介 -> 基本資料 -> 付費 -> 幹部確認 -> 成功
  if (interaction.inGuild()) {
    await interaction.reply({
      content: messages.join.useDirectMessage,
      ephemeral: true,
    });
    return;
  }

  const id = BigInt(interaction.user.id);

  // 查詢加入進度，如果沒有就建立一個
  const member = await prisma.member.upsert({
    create: { discordId: id },
    update: {},
    where: { discordId: id },
  });

  const replies = new Map<
    RegistrationStep,
    InteractionReplyOptions & MessageEditOptions
  >();
  replies.set("INTRODUCTION", getIntroductionReply());
  replies.set("BASIC_INFORMATION", getBasicInformationReply());
  replies.set("COMMITTEE_CONFIRMATION", getCommitteeConfirmation());

  const reply = replies.get(member.registrationStep) ?? messages.defaultError;
  const response = await interaction.reply(reply);

  const buttonCollector = response.createMessageComponentCollector();
  buttonCollector.on("collect", async (interaction) => {
    switch (interaction.customId) {
      case "introductionNext":
        await prisma.member.update({
          data: { registrationStep: "BASIC_INFORMATION" },
          where: { discordId: id },
        });
        await interaction.reply(replies.get("BASIC_INFORMATION")!);
        break;

      case "basicInformationShowModal":
        await interaction.showModal(getBasicInformationModal());
        try {
          const submission = await interaction.awaitModalSubmit({ time: 3_600_000 }); // 1 hour

          // We received the modal submission.
          const getField = (id: string) =>
            submission.fields.getTextInputValue(id);
          const email = getField("emailInput");
          const name = getField("nameInput");
          const studentId = getField("studentIdInput");
          await prisma.member.update({
            data: { email, name, studentId, registrationStep: "COMMITTEE_CONFIRMATION" },
            where: { discordId: id },
          });

          await submission.reply(replies.get("COMMITTEE_CONFIRMATION")!);
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          let content = messages.defaultError;
          if (error.name === DiscordjsErrorCodes.InteractionCollectorError) {
            content = messages.join.confirmationTimeout;
          }
          await interaction.editReply(content);
        }
        break;

      case "committeeConfirmationEdit":
        await prisma.member.update({
          data: { registrationStep: "BASIC_INFORMATION" },
          where: { discordId: id },
        });
        await interaction.reply(replies.get("BASIC_INFORMATION")!);
        break;

      default:
        break;
    }
  });
};

export default executeJoinSubcommand;

function getIntroductionReply() {
  const next = new ButtonBuilder()
    .setCustomId("introductionNext")
    .setLabel("下一步")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("👉");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  actionRow.addComponents(next);

  return {
    content: messages.join.introduction,
    components: [actionRow],
  };
}

function getBasicInformationModal() {
  // 製作包含文字輸入的對話框專用 ActionRow
  const makeTextInputActionRow = (customId: string, label: string) => {
    const textInput = new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(TextInputStyle.Short);
    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>();
    row.addComponents(textInput);
    return row;
  };

  return new ModalBuilder()
    .setCustomId("basicInformationModal")
    .setTitle("輸入基本資料")
    .addComponents(
      makeTextInputActionRow("emailInput", "電子郵件"),
      makeTextInputActionRow("nameInput", "姓名"),
      makeTextInputActionRow("studentIdInput", "學號"),
    );
}

function getBasicInformationReply() {
  const showModal = new ButtonBuilder()
    .setCustomId("basicInformationShowModal")
    .setLabel("輸入基本資料")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📝");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  actionRow.addComponents(showModal);
  return {
    content: messages.join.basicInformation,
    components: [actionRow],
  };
}

function getCommitteeConfirmation() {
  const editButton = new ButtonBuilder()
    .setCustomId("committeeConfirmationEdit")
    .setLabel("修改資料")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📝");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(editButton);
  return {
    content: messages.join.committeeConfirmation,
    components: [actionRow],
  };
}
