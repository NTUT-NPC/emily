import type { Member } from "@prisma/client";
import { RegistrationStep } from "@prisma/client";
import type { InteractionReplyOptions, MessageActionRowComponentBuilder, MessageEditOptions, TextChannel } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder } from "discord.js";
import config, { messages } from "../../config.js";
import { prisma } from "../../main.js";
import type { Subcommand } from "../types.js";
import { makeTextInputActionRow, showAndAwaitModal } from "../index.js";

const executeJoinSubcommand: Subcommand = async (interaction) => {
  // 這個指令限私訊使用
  if (interaction.inGuild()) {
    await interaction.reply({
      content: messages.join.useDirectMessage,
      ephemeral: true,
    });
    return;
  }

  const discordId = BigInt(interaction.user.id);
  const notificationChannel = interaction.client.channels.cache.get(config.membershipNotificationChannelId) as TextChannel;

  // 查詢加入進度，如果沒有就建立一個
  let member = await prisma.member.upsert({
    create: { discordId },
    update: {},
    where: { discordId },
  });

  const replies = new Map<
    RegistrationStep,
    InteractionReplyOptions & MessageEditOptions | string
  >();
  replies.set(RegistrationStep.INTRODUCTION, getIntroductionReply());
  replies.set(RegistrationStep.BASIC_INFORMATION, getBasicInformationReply());
  replies.set(RegistrationStep.COMMITTEE_CONFIRMATION, getCommitteeConfirmation());
  replies.set(RegistrationStep.COMPLETE, messages.join.alreadyJoined);

  const reply = replies.get(member.registrationStep) ?? messages.error.generic;
  const response = await interaction.reply(reply);

  const buttonCollector = response.createMessageComponentCollector();
  buttonCollector.on("collect", async (interaction) => {
    switch (interaction.customId) {
      case "introductionNext":
        member = await prisma.member.update({
          data: { registrationStep: RegistrationStep.BASIC_INFORMATION },
          where: { discordId },
        });
        await interaction.reply(replies.get(RegistrationStep.BASIC_INFORMATION)!);
        break;

      case "basicInformationShowModal": {
        // Prevent the modal from opening if the user is already a member.
        // This happens when the committee confirms the member while user is filling the form.
        if (member.registrationStep === RegistrationStep.COMPLETE) {
          await interaction.reply(messages.join.alreadyJoined);
          return;
        }

        const submission = await showAndAwaitModal(interaction, getBasicInformationModal());
        if (submission) {
          const email = submission.fields.getTextInputValue("emailInput");
          const name = submission.fields.getTextInputValue("nameInput");
          const studentId = submission.fields.getTextInputValue("studentIdInput");
          member = await prisma.member.update({
            data: { email, name, studentId, registrationStep: RegistrationStep.COMMITTEE_CONFIRMATION },
            where: { discordId },
          });

          if (canSendNotification(member)) {
            await sendNotification(member, notificationChannel);
          }
          await submission.reply(replies.get(RegistrationStep.COMMITTEE_CONFIRMATION)!);
        }
        break;
      }

      case "committeeConfirmationEdit":
        member = await prisma.member.update({
          data: { registrationStep: RegistrationStep.BASIC_INFORMATION },
          where: { discordId },
        });
        await interaction.reply(replies.get(RegistrationStep.BASIC_INFORMATION)!);
        break;

      case "committeeConfirmationNotify": {
        const member = await prisma.member.findUnique({ where: { discordId } });
        if (!member) {
          await interaction.reply(messages.error.generic);
          return;
        }

        if (canSendNotification(member)) {
          await sendNotification(member, notificationChannel);
          await interaction.reply(messages.join.notificationSent);
          return;
        }

        await interaction.reply({
          content: messages.join.notificationTimeout(member.notificationSentAt!),
          ephemeral: true,
        });
        break;
      }

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
  const notifyButton = new ButtonBuilder()
    .setCustomId("committeeConfirmationNotify")
    .setLabel("再次通知幹部")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📣");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(editButton)
    .addComponents(notifyButton);
  return {
    content: messages.join.committeeConfirmation,
    components: [actionRow],
  };
}

function canSendNotification(member: Member): boolean {
  const notificationSentAt = member.notificationSentAt ?? new Date(0);
  const now = new Date();
  return +now - +notificationSentAt > config.memberJoinNotificationTimeoutSeconds * 1000;
}

async function sendNotification(member: Member, channel: TextChannel) {
  const acceptButton = new ButtonBuilder()
    .setCustomId("joinNotificationAccept")
    .setLabel("接受")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✔");
  const rejectButton = new ButtonBuilder()
    .setCustomId("joinNotificationReject")
    .setLabel("拒絕")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("✖");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(acceptButton)
    .addComponents(rejectButton);

  const buttonCollector = channel.createMessageComponentCollector();
  buttonCollector.on("collect", async (interaction) => {
    if (!interaction.inGuild()) {
      return;
    }
    const requester = interaction.guild!.members.cache.get(member.discordId.toString())!;

    switch (interaction.customId) {
      case "joinNotificationAccept": {
        member = await prisma.member.update({
          data: { registrationStep: "COMPLETE", joinedAt: new Date() },
          where: { discordId: member.discordId },
        });
        const membershipRole = interaction.guild!.roles.cache.get(config.membershipRoleId)!;
        await requester.roles.add(membershipRole);
        await requester.send(messages.join.accept);
        await interaction.reply(`<@${interaction.user.id}> 已接受 <@${member.discordId}> 的加入請求。`);
        break;
      }

      case "joinNotificationReject": {
        const rejectReasonModal = new ModalBuilder()
          .setCustomId("joinNotificationRejectReason")
          .setTitle("輸入理由")
          .addComponents(makeTextInputActionRow("rejectReasonInput", "請輸入完整的拒絕理由，這會傳送給請求加入者。他會回到「填寫基本資料」步驟。"));

        const submission = await showAndAwaitModal(interaction, rejectReasonModal);
        if (submission) {
          // Notify the requester and change the registration step.
          const reason = submission.fields.getTextInputValue("rejectReasonInput");
          member = await prisma.member.update({
            data: { registrationStep: RegistrationStep.BASIC_INFORMATION },
            where: { discordId: member.discordId },
          });
          await requester.send(messages.join.reject(reason));
          await submission.reply(
            `<@${submission.user.id}> 已拒絕 <@${member.discordId}> 的加入請求，理由：${reason}。`,
          );
        }

        break;
      }
    }
  });

  await channel.send({ content: messages.join.notification(member), components: [actionRow] });
  await prisma.member.update({
    data: { notificationSentAt: new Date() },
    where: { discordId: member.discordId },
  });
}
