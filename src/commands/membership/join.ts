import type { InteractionReplyOptions, MessageActionRowComponentBuilder, MessageEditOptions, TextChannel } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { makeTextInputActionRow, showModalAndGetSubmission } from "..";
import config, { messages } from "#/config";
import type { Member, Subcommand } from "#/types";
import { db } from "#drizzle/db";
import { member as table } from "#drizzle/schema";

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

  let [member] = await db.insert(table)
    .values({ discordId })
    .onConflictDoNothing()
    .returning();

  const replies = new Map<
    Member["registrationStep"],
    InteractionReplyOptions & MessageEditOptions | string
  >();
  replies.set("INTRODUCTION", getIntroductionReply());
  replies.set("BASIC_INFORMATION", getBasicInformationReply());
  replies.set("COMMITTEE_CONFIRMATION", getCommitteeConfirmation());
  replies.set("COMPLETE", messages.join.alreadyJoined);

  const reply = replies.get(member.registrationStep) ?? messages.error.generic;
  const response = await interaction.reply(reply);

  const buttonCollector = response.createMessageComponentCollector();
  buttonCollector.on("collect", async (interaction) => {
    switch (interaction.customId) {
      case "introductionNext":
        [member] = await db.update(table)
          .set({ registrationStep: "BASIC_INFORMATION" })
          .where(eq(table.discordId, discordId))
          .returning();

        await interaction.reply(replies.get("BASIC_INFORMATION")!);
        break;

      case "basicInformationShowModal": {
        // Prevent the modal from opening if the user is already a member.
        // This happens when the committee confirms the member while user is filling the form.
        if (member.registrationStep === "COMPLETE") {
          await interaction.reply(messages.join.alreadyJoined);
          return;
        }

        const submission = await showModalAndGetSubmission(interaction, getBasicInformationModal());
        const email = submission.fields.getTextInputValue("emailInput");
        const name = submission.fields.getTextInputValue("nameInput");
        const studentId = submission.fields.getTextInputValue("studentIdInput");
        [member] = await db.update(table)
          .set({ email, name, studentId, registrationStep: "COMMITTEE_CONFIRMATION" })
          .where(eq(table.discordId, discordId))
          .returning();

        if (canSendNotification(member)) {
          await sendNotification(member, notificationChannel);
        }
        await submission.reply(replies.get("COMMITTEE_CONFIRMATION")!);
        break;
      }

      case "committeeConfirmationEdit":
        [member] = await db.update(table)
          .set({ registrationStep: "BASIC_INFORMATION" })
          .where(eq(table.discordId, discordId))
          .returning();

        await interaction.reply(replies.get("BASIC_INFORMATION")!);
        break;

      case "committeeConfirmationNotify": {
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
        [member] = await db.update(table)
          .set({
            registrationStep: "COMPLETE",
            joinedAt: new Date(),
          })
          .where(eq(table.discordId, member.discordId))
          .returning();

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

        // Notify the requester and change the registration step.
        const submission = await showModalAndGetSubmission(interaction, rejectReasonModal);
        const reason = submission.fields.getTextInputValue("rejectReasonInput");

        [member] = await db.update(table)
          .set({ registrationStep: "BASIC_INFORMATION" })
          .where(eq(table.discordId, member.discordId))
          .returning();

        await requester.send(messages.join.reject(reason));
        await submission.reply(
          `<@${submission.user.id}> 已拒絕 <@${member.discordId}> 的加入請求，理由：${reason}。`,
        );

        break;
      }
    }
  });

  await channel.send({ content: messages.join.notification(member), components: [actionRow] });
  await db.update(table)
    .set({ notificationSentAt: new Date() })
    .where(eq(table.discordId, member.discordId));
}
