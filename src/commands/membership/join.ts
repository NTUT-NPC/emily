import type { ButtonInteraction, Interaction, InteractionReplyOptions, MessageActionRowComponentBuilder, MessageEditOptions, ModalSubmitInteraction, TextChannel } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, PermissionFlagsBits } from "discord.js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { makeTextInputActionRow } from "../shared";
import config, { messages } from "#/config";
import type { Member, Subcommand } from "#/types";
import { db } from "#drizzle/db";
import { membershipConfig as membershipConfigTable, member as table } from "#/drizzle/schema";

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

  // Drizzle bug: `onConflictDoNothing` does not return the inserted row on conflict.
  // see https://github.com/drizzle-team/drizzle-orm/issues/1341
  // let [member] = await db.insert(table)
  //   .values({ discordId })
  //   .onConflictDoNothing()
  //   .returning();

  const [member] = await db.insert(table)
    .values({ discordId })
    .onConflictDoUpdate({
      target: [table.discordId],
      set: { discordId },
    })
    .returning();

  await interaction.reply(getApplicantJoinReply(member.registrationStep));
};

export default executeJoinSubcommand;

const applicantJoinCustomIdPrefix = "membershipJoinApplicant";

type ApplicantJoinAction =
  | "introduction-next"
  | "basic-information-show-modal"
  | "basic-information-submit"
  | "committee-confirmation-edit"
  | "committee-confirmation-notify";
type ApplicantJoinInteraction = ButtonInteraction | ModalSubmitInteraction;

function makeApplicantJoinCustomId(action: ApplicantJoinAction): string {
  return `${applicantJoinCustomIdPrefix}:${action}`;
}

function parseApplicantJoinCustomId(customId: string): ApplicantJoinAction | undefined {
  switch (customId) {
    case makeApplicantJoinCustomId("introduction-next"):
      return "introduction-next";
    case makeApplicantJoinCustomId("basic-information-show-modal"):
      return "basic-information-show-modal";
    case makeApplicantJoinCustomId("basic-information-submit"):
      return "basic-information-submit";
    case makeApplicantJoinCustomId("committee-confirmation-edit"):
      return "committee-confirmation-edit";
    case makeApplicantJoinCustomId("committee-confirmation-notify"):
      return "committee-confirmation-notify";
    default:
      break;
  }
}

export function isApplicantJoinInteraction(interaction: Interaction): interaction is ApplicantJoinInteraction {
  if (!interaction.isButton() && !interaction.isModalSubmit()) {
    return false;
  }

  return interaction.customId.startsWith(`${applicantJoinCustomIdPrefix}:`);
}

export async function executeApplicantJoinInteraction(interaction: ApplicantJoinInteraction) {
  try {
    const action = parseApplicantJoinCustomId(interaction.customId);
    if (!action) {
      await replyWithApplicantInteractionError(interaction);
      return;
    }

    if (action === "basic-information-show-modal") {
      if (!interaction.isButton()) {
        await replyWithApplicantInteractionError(interaction);
        return;
      }

      await interaction.showModal(getBasicInformationModal());
      return;
    }

    if (action === "basic-information-submit") {
      if (!interaction.isModalSubmit()) {
        await replyWithApplicantInteractionError(interaction);
        return;
      }

      await interaction.deferReply();
      const email = interaction.fields.getTextInputValue("emailInput");
      const name = interaction.fields.getTextInputValue("nameInput");
      const studentId = interaction.fields.getTextInputValue("studentIdInput");
      const discordId = BigInt(interaction.user.id);
      const membershipConfiguration = await getApplicantMembershipConfiguration(
        interaction.client,
        interaction.user.id,
      );
      if (!membershipConfiguration) {
        await interaction.editReply(messages.join.configurationMissing);
        return;
      }
      const [member] = await db.update(table)
        .set({
          email,
          name,
          studentId,
          registrationStep: "COMMITTEE_CONFIRMATION",
          requestRevision: sql`${table.requestRevision} + 1`,
        })
        .where(and(
          eq(table.discordId, discordId),
          eq(table.registrationStep, "BASIC_INFORMATION"),
        ))
        .returning();

      if (!member) {
        await replyWithCurrentApplicantState(interaction, discordId);
        return;
      }

      if (canSendNotification(member)) {
        const notificationChannel = interaction.client.channels.cache.get(
          membershipConfiguration.notificationChannel.toString(),
        ) as TextChannel;
        await sendNotification(member, notificationChannel);
      }
      await interaction.editReply(getApplicantJoinReply("COMMITTEE_CONFIRMATION"));
      return;
    }

    if (!interaction.isButton()) {
      await replyWithApplicantInteractionError(interaction);
      return;
    }

    await interaction.deferReply();
    const discordId = BigInt(interaction.user.id);
    switch (action) {
      case "introduction-next": {
        const [member] = await db.update(table)
          .set({ registrationStep: "BASIC_INFORMATION" })
          .where(and(
            eq(table.discordId, discordId),
            eq(table.registrationStep, "INTRODUCTION"),
          ))
          .returning();
        if (!member) {
          await replyWithCurrentApplicantState(interaction, discordId);
          return;
        }
        await interaction.editReply(getApplicantJoinReply("BASIC_INFORMATION"));
        return;
      }
      case "committee-confirmation-edit": {
        const [member] = await db.update(table)
          .set({ registrationStep: "BASIC_INFORMATION" })
          .where(and(
            eq(table.discordId, discordId),
            eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
          ))
          .returning();
        if (!member) {
          await replyWithCurrentApplicantState(interaction, discordId);
          return;
        }
        await interaction.editReply(getApplicantJoinReply("BASIC_INFORMATION"));
        return;
      }
      case "committee-confirmation-notify": {
        const [member] = await db.select()
          .from(table)
          .where(eq(table.discordId, discordId));
        if (!member) {
          await interaction.editReply(messages.error.generic);
          return;
        }
        if (member.registrationStep !== "COMMITTEE_CONFIRMATION") {
          await interaction.editReply(getApplicantJoinReply(member.registrationStep));
          return;
        }

        if (canSendNotification(member)) {
          const membershipConfiguration = await getApplicantMembershipConfiguration(
            interaction.client,
            interaction.user.id,
          );
          if (!membershipConfiguration) {
            await interaction.editReply(messages.join.configurationMissing);
            return;
          }
          const notificationChannel = interaction.client.channels.cache.get(
            membershipConfiguration.notificationChannel.toString(),
          ) as TextChannel;
          await sendNotification(member, notificationChannel);
          await interaction.editReply(messages.join.notificationSent);
          return;
        }

        await interaction.editReply({
          content: messages.join.notificationTimeout(member.notificationSentAt!),
        });
      }
    }
  } catch (error) {
    console.error("Failed to handle applicant membership join interaction.", error);
    await replyWithApplicantInteractionError(interaction);
  }
}

async function replyWithCurrentApplicantState(
  interaction: ApplicantJoinInteraction,
  discordId: bigint,
) {
  const [member] = await db.select()
    .from(table)
    .where(eq(table.discordId, discordId));
  await interaction.editReply(
    member ? getApplicantJoinReply(member.registrationStep) : messages.error.generic,
  );
}

async function getApplicantMembershipConfiguration(
  client: Interaction["client"],
  applicantId: string,
) {
  const configurations = await db.select({
    guild: membershipConfigTable.guild,
    notificationChannel: membershipConfigTable.notificationChannel,
    membershipRole: membershipConfigTable.membershipRole,
  })
    .from(membershipConfigTable);
  const matchingConfigurations = [];
  for (const configuration of configurations) {
    const guild = await client.guilds.fetch(configuration.guild.toString()).catch(() => undefined);
    if (!guild) {
      continue;
    }
    const applicant = await guild.members.fetch(applicantId).catch(() => undefined);
    if (applicant) {
      matchingConfigurations.push(configuration);
      if (matchingConfigurations.length > 1) {
        return;
      }
    }
  }
  return matchingConfigurations[0];
}

function getApplicantJoinReply(
  registrationStep: Member["registrationStep"],
): InteractionReplyOptions & MessageEditOptions | string {
  switch (registrationStep) {
    case "INTRODUCTION":
      return getIntroductionReply();
    case "BASIC_INFORMATION":
      return getBasicInformationReply();
    case "COMMITTEE_CONFIRMATION":
      return getCommitteeConfirmation();
    case "COMPLETE":
      return messages.join.alreadyJoined;
    default:
      return messages.error.generic;
  }
}

async function replyWithApplicantInteractionError(interaction: ApplicantJoinInteraction) {
  if (interaction.deferred) {
    await interaction.editReply(messages.error.generic);
    return;
  }

  if (interaction.replied) {
    await interaction.followUp({ content: messages.error.generic, ephemeral: true });
    return;
  }

  await interaction.reply({ content: messages.error.generic, ephemeral: true });
}

function getIntroductionReply() {
  const next = new ButtonBuilder()
    .setCustomId(makeApplicantJoinCustomId("introduction-next"))
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
    .setCustomId(makeApplicantJoinCustomId("basic-information-submit"))
    .setTitle("輸入基本資料")
    .addComponents(
      makeTextInputActionRow("emailInput", "電子郵件"),
      makeTextInputActionRow("nameInput", "姓名"),
      makeTextInputActionRow("studentIdInput", "學號"),
    );
}

function getBasicInformationReply() {
  const showModal = new ButtonBuilder()
    .setCustomId(makeApplicantJoinCustomId("basic-information-show-modal"))
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
    .setCustomId(makeApplicantJoinCustomId("committee-confirmation-edit"))
    .setLabel("修改資料")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📝");
  const notifyButton = new ButtonBuilder()
    .setCustomId(makeApplicantJoinCustomId("committee-confirmation-notify"))
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

async function sendNotification(member: Member, channel: TextChannel): Promise<Member> {
  const previousNotificationSentAt = member.notificationSentAt;
  const notificationSentAt = new Date();
  const previousCooldownCondition = previousNotificationSentAt
    ? eq(table.notificationSentAt, previousNotificationSentAt)
    : isNull(table.notificationSentAt);
  const [notifiedMember] = await db.update(table)
    .set({ notificationSentAt })
    .where(and(
      eq(table.discordId, member.discordId),
      eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
      eq(table.requestRevision, member.requestRevision),
      previousCooldownCondition,
    ))
    .returning();
  if (!notifiedMember) {
    const [currentMember] = await db.select()
      .from(table)
      .where(eq(table.discordId, member.discordId));
    return currentMember ?? member;
  }

  const acceptButton = new ButtonBuilder()
    .setCustomId(makeJoinNotificationCustomId("accept", member.discordId, member.requestRevision))
    .setLabel("接受")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✔");
  const rejectButton = new ButtonBuilder()
    .setCustomId(makeJoinNotificationCustomId("reject", member.discordId, member.requestRevision))
    .setLabel("拒絕")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("✖");
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(acceptButton)
    .addComponents(rejectButton);

  try {
    await channel.send({ content: messages.join.notification(notifiedMember), components: [actionRow] });
  } catch (error) {
    await db.update(table)
      .set({ notificationSentAt: previousNotificationSentAt })
      .where(and(
        eq(table.discordId, member.discordId),
        eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
        eq(table.requestRevision, member.requestRevision),
        eq(table.notificationSentAt, notificationSentAt),
      ));
    throw error;
  }

  return notifiedMember;
}

const joinNotificationCustomIdPrefix = "membershipJoin";
const legacyJoinNotificationCustomIds: Record<string, true> = {
  joinNotificationAccept: true,
  joinNotificationReject: true,
  joinNotificationRejectReason: true,
};
const maximumDiscordId = 18_446_744_073_709_551_615n;
const maximumRequestRevision = 2_147_483_647;

type JoinNotificationAction = "accept" | "reject" | "rejectReason";
type JoinNotificationInteraction = ButtonInteraction | ModalSubmitInteraction;

export function isJoinNotificationInteraction(interaction: Interaction): interaction is JoinNotificationInteraction {
  if (!interaction.isButton() && !interaction.isModalSubmit()) {
    return false;
  }

  return interaction.customId.startsWith(`${joinNotificationCustomIdPrefix}:`) ||
    interaction.customId in legacyJoinNotificationCustomIds;
}

export function makeJoinNotificationCustomId(
  action: JoinNotificationAction,
  discordId: bigint,
  requestRevision: number,
): string {
  return `${joinNotificationCustomIdPrefix}:${action}:${discordId}:${requestRevision}`;
}

export function parseJoinNotificationCustomId(customId: string): {
  action: JoinNotificationAction;
  discordId: bigint;
  requestRevision: number;
} | undefined {
  const match = /^membershipJoin:(accept|reject|rejectReason):([1-9]\d{0,19}):(0|[1-9]\d{0,9})$/.exec(customId);
  if (!match) {
    return;
  }

  const discordId = BigInt(match[2]!);
  const requestRevision = Number(match[3]);
  if (
    discordId > maximumDiscordId ||
    !Number.isSafeInteger(requestRevision) ||
    requestRevision > maximumRequestRevision
  ) {
    return;
  }

  return {
    action: match[1] as JoinNotificationAction,
    discordId,
    requestRevision,
  };
}

export async function executeJoinNotificationInteraction(interaction: JoinNotificationInteraction) {
  try {
    const notification = parseJoinNotificationCustomId(interaction.customId);
    if (!notification) {
      await replyWithStaleNotification(interaction);
      return;
    }

    if (interaction.isButton() && notification.action === "reject") {
      await interaction.showModal(getRejectReasonModal(
        notification.discordId,
        notification.requestRevision,
      ));
      return;
    }

    if (!interaction.inGuild()) {
      await interaction.reply({ content: messages.error.useInGuild, ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "必須有管理身份組的權限", ephemeral: true });
      return;
    }

    if (interaction.isButton()) {
      if (notification.action !== "accept") {
        await replyWithStaleNotification(interaction);
        return;
      }

      await interaction.deferReply();
      await acceptJoinNotification(
        interaction,
        notification.discordId,
        notification.requestRevision,
      );
      return;
    }

    if (notification.action !== "rejectReason") {
      await replyWithStaleNotification(interaction);
      return;
    }

    const reason = interaction.fields.getTextInputValue("rejectReasonInput");
    await interaction.deferReply();
    await rejectJoinNotification(
      interaction,
      notification.discordId,
      notification.requestRevision,
      reason,
    );
  } catch (error) {
    console.error("Failed to handle membership join notification interaction.", error);
    await replyWithInteractionError(interaction);
  }
}

function getRejectReasonModal(discordId: bigint, requestRevision: number) {
  return new ModalBuilder()
    .setCustomId(makeJoinNotificationCustomId("rejectReason", discordId, requestRevision))
    .setTitle("輸入理由")
    .addComponents(makeTextInputActionRow(
      "rejectReasonInput",
      "請輸入完整的拒絕理由，這會傳送給請求加入者。他會回到「填寫基本資料」步驟。",
    ));
}

async function acceptJoinNotification(
  interaction: ButtonInteraction<"cached" | "raw">,
  discordId: bigint,
  requestRevision: number,
) {
  const [pendingMember] = await db.select()
    .from(table)
    .where(eq(table.discordId, discordId));
  if (
    !pendingMember ||
    pendingMember.registrationStep !== "COMMITTEE_CONFIRMATION" ||
    pendingMember.requestRevision !== requestRevision
  ) {
    await replyWithStaleNotification(interaction);
    return;
  }

  const guild = interaction.guild!;
  const [membershipConfiguration] = await db.select({
    membershipRole: membershipConfigTable.membershipRole,
  })
    .from(membershipConfigTable)
    .where(eq(membershipConfigTable.guild, BigInt(guild.id)))
    .limit(1);
  if (!membershipConfiguration) {
    await interaction.editReply(messages.join.configurationMissing);
    return;
  }
  const [requester, membershipRole] = await Promise.all([
    guild.members.fetch(discordId.toString()).catch(() => null),
    guild.roles.fetch(membershipConfiguration.membershipRole.toString()).catch(() => null),
  ]);
  if (!requester || !membershipRole) {
    await interaction.editReply("找不到請求加入者或社員身份組，尚未接受這個加入請求。");
    return;
  }

  const joinedAt = new Date();
  const [member] = await db.update(table)
    .set({
      registrationStep: "COMPLETE",
      joinedAt,
    })
    .where(and(
      eq(table.discordId, discordId),
      eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
      eq(table.requestRevision, requestRevision),
    ))
    .returning();
  if (!member) {
    await replyWithStaleNotification(interaction);
    return;
  }

  try {
    await requester.roles.add(membershipRole);
  } catch (error) {
    await db.update(table)
      .set({
        registrationStep: "COMMITTEE_CONFIRMATION",
        joinedAt: null,
      })
      .where(and(
        eq(table.discordId, discordId),
        eq(table.registrationStep, "COMPLETE"),
        eq(table.joinedAt, joinedAt),
        eq(table.requestRevision, requestRevision),
      ));
    console.error(`Failed to add membership role to ${discordId}.`, error);
    await interaction.editReply("無法分配社員身份組，尚未接受這個加入請求，請稍後再試。");
    return;
  }

  let directMessageFailed = false;
  try {
    await requester.send(messages.join.accept);
  } catch (error) {
    directMessageFailed = true;
    console.error(`Failed to notify accepted member ${discordId}.`, error);
  }

  await interaction.editReply(
    `<@${interaction.user.id}> 已接受 <@${discordId}> 的加入請求。${directMessageFailed ? "（無法傳送私訊通知。）" : ""}`,
  );
}

async function rejectJoinNotification(
  interaction: ModalSubmitInteraction<"cached" | "raw">,
  discordId: bigint,
  requestRevision: number,
  reason: string,
) {
  const [member] = await db.update(table)
    .set({ registrationStep: "BASIC_INFORMATION" })
    .where(and(
      eq(table.discordId, discordId),
      eq(table.registrationStep, "COMMITTEE_CONFIRMATION"),
      eq(table.requestRevision, requestRevision),
    ))
    .returning();
  if (!member) {
    await replyWithStaleNotification(interaction);
    return;
  }

  let directMessageFailed = false;
  try {
    const requester = await interaction.client.users.fetch(discordId.toString());
    await requester.send(messages.join.reject(reason));
  } catch (error) {
    directMessageFailed = true;
    console.error(`Failed to notify rejected member ${discordId}.`, error);
  }

  await interaction.editReply(
    `<@${interaction.user.id}> 已拒絕 <@${discordId}> 的加入請求，理由：${reason}。${directMessageFailed ? "（無法傳送私訊通知。）" : ""}`,
  );
}

async function replyWithStaleNotification(interaction: JoinNotificationInteraction) {
  const content = "這個加入請求按鈕無效或已經失效，請使用「/社員 請求 查看」確認目前狀態。";
  if (interaction.deferred) {
    await interaction.editReply(content);
    return;
  }

  if (interaction.replied) {
    await interaction.followUp({ content, ephemeral: true });
    return;
  }

  await interaction.reply({ content, ephemeral: true });
}

async function replyWithInteractionError(interaction: JoinNotificationInteraction) {
  if (interaction.deferred) {
    await interaction.editReply(messages.error.generic);
    return;
  }

  if (interaction.replied) {
    await interaction.followUp({ content: messages.error.generic, ephemeral: true });
    return;
  }

  await interaction.reply({ content: messages.error.generic, ephemeral: true });
}
