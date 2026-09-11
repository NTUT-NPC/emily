import assert from "node:assert/strict";
// eslint-disable-next-line test/no-import-node-test -- Use the built-in runner without adding a test dependency.
import { beforeEach, describe, it } from "node:test";
import executeJoinSubcommand, { executeApplicantJoinInteraction } from "./join";
import { messages } from "#/config";
import { db as productionDb } from "#/drizzle/db";
import type { Member } from "#/types";

const applicantId = 42n;
const events: string[] = [];
let persistedMember: Member;

function memberAt(registrationStep: Member["registrationStep"]): Member {
  return {
    id: 1,
    createdAt: new Date(0),
    joinedAt: null,
    notificationSentAt: new Date(),
    registrationStep,
    discordId: applicantId,
    requestRevision: 0,
    name: null,
    email: null,
    studentId: null,
  };
}

function applyUpdate(values: Record<string, unknown>) {
  const next = { ...values };
  if ("requestRevision" in next) {
    next.requestRevision = persistedMember.requestRevision + 1;
  }
  persistedMember = { ...persistedMember, ...next } as Member;
}

const fakeDb = {
  insert() {
    events.push("db:insert");
    return {
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [persistedMember],
        }),
      }),
    };
  },
  update() {
    events.push("db:update");
    return {
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            applyUpdate(values);
            return [persistedMember];
          },
        }),
      }),
    };
  },
  select() {
    events.push("db:select");
    return {
      from: () => ({
        where: async () => [persistedMember],
      }),
    };
  },
};

Object.assign(productionDb, fakeDb);

beforeEach(() => {
  events.length = 0;
  persistedMember = memberAt("INTRODUCTION");
});

interface ComponentJson {
  components?: Array<{ custom_id?: string }>;
}

function componentCustomIds(reply: unknown): string[] {
  if (typeof reply !== "object" || reply === null || !("components" in reply)) {
    return [];
  }

  const rows = reply.components as Array<{ toJSON: () => ComponentJson }>;
  return rows.flatMap((row) => row.toJSON().components?.map((component) => component.custom_id ?? "") ?? []);
}

function assertReplyContent(reply: unknown, expected: string) {
  if (typeof reply === "string") {
    assert.equal(reply, expected);
    return;
  }
  assert.ok(typeof reply === "object" && reply !== null && "content" in reply);
  assert.equal(reply.content, expected);
}

function makeCommandInteraction() {
  let reply: unknown;
  return {
    interaction: {
      inGuild: () => false,
      user: { id: applicantId.toString() },
      reply: async (value: unknown) => {
        events.push("reply");
        reply = value;
      },
    },
    get reply() {
      return reply;
    },
  };
}

function makeApplicantInteraction(customId: string, form: "button" | "modal") {
  let deferred = false;
  let replied = false;
  let reply: unknown;
  let modal: unknown;
  return {
    interaction: {
      customId,
      user: { id: applicantId.toString() },
      client: { channels: { cache: new Map() } },
      fields: {
        getTextInputValue: (name: string) => ({
          emailInput: "applicant@example.com",
          nameInput: "Applicant",
          studentIdInput: "123456789",
        })[name as "emailInput" | "nameInput" | "studentIdInput"],
      },
      isButton: () => form === "button",
      isModalSubmit: () => form === "modal",
      get deferred() {
        return deferred;
      },
      get replied() {
        return replied;
      },
      deferReply: async () => {
        events.push("deferReply");
        deferred = true;
      },
      editReply: async (value: unknown) => {
        events.push("editReply");
        reply = value;
      },
      reply: async (value: unknown) => {
        events.push("reply");
        replied = true;
        reply = value;
      },
      followUp: async (value: unknown) => {
        events.push("followUp");
        reply = value;
      },
      showModal: async (value: unknown) => {
        events.push("showModal");
        replied = true;
        modal = value;
      },
    },
    get reply() {
      return reply;
    },
    get modal() {
      return modal;
    },
  };
}

describe("applicant join command rendering", () => {
  const cases: Array<{
    step: Member["registrationStep"];
    content: string;
    customIds: string[];
  }> = [
    {
      step: "INTRODUCTION",
      content: messages.join.introduction,
      customIds: ["membershipJoinApplicant:introduction-next"],
    },
    {
      step: "BASIC_INFORMATION",
      content: messages.join.basicInformation,
      customIds: ["membershipJoinApplicant:basic-information-show-modal"],
    },
    {
      step: "COMMITTEE_CONFIRMATION",
      content: messages.join.committeeConfirmation,
      customIds: [
        "membershipJoinApplicant:committee-confirmation-edit",
        "membershipJoinApplicant:committee-confirmation-notify",
      ],
    },
    {
      step: "COMPLETE",
      content: messages.join.alreadyJoined,
      customIds: [],
    },
  ];

  for (const { step, content, customIds } of cases) {
    it(`renders persisted ${step} state without a collector`, async () => {
      persistedMember = memberAt(step);
      const command = makeCommandInteraction();

      await executeJoinSubcommand(command.interaction as never);

      assertReplyContent(command.reply, content);
      assert.deepEqual(componentCustomIds(command.reply), customIds);
      assert.deepEqual(events, ["db:insert", "reply"]);
    });
  }
});

describe("applicant controls after restart", () => {
  it("advances introduction from a fresh button interaction", async () => {
    const control = makeApplicantInteraction("membershipJoinApplicant:introduction-next", "button");

    await executeApplicantJoinInteraction(control.interaction as never);

    assert.equal(persistedMember.registrationStep, "BASIC_INFORMATION");
    assertReplyContent(control.reply, messages.join.basicInformation);
    assert.deepEqual(events, ["deferReply", "db:update", "editReply"]);
  });

  it("opens the basic-information modal from a fresh button interaction", async () => {
    const control = makeApplicantInteraction(
      "membershipJoinApplicant:basic-information-show-modal",
      "button",
    );

    await executeApplicantJoinInteraction(control.interaction as never);

    assert.deepEqual(events, ["showModal"]);
    const modal = control.modal as { toJSON: () => { custom_id: string } };
    assert.equal(modal.toJSON().custom_id, "membershipJoinApplicant:basic-information-submit");
  });

  it("submits basic information from a fresh modal interaction", async () => {
    persistedMember = memberAt("BASIC_INFORMATION");
    const control = makeApplicantInteraction(
      "membershipJoinApplicant:basic-information-submit",
      "modal",
    );

    await executeApplicantJoinInteraction(control.interaction as never);

    assert.equal(persistedMember.email, "applicant@example.com");
    assert.equal(persistedMember.name, "Applicant");
    assert.equal(persistedMember.studentId, "123456789");
    assert.equal(persistedMember.registrationStep, "COMMITTEE_CONFIRMATION");
    assert.equal(persistedMember.requestRevision, 1);
    assertReplyContent(control.reply, messages.join.committeeConfirmation);
    assert.deepEqual(events, ["deferReply", "db:update", "editReply"]);
  });

  it("returns to basic information from a fresh edit button interaction", async () => {
    persistedMember = memberAt("COMMITTEE_CONFIRMATION");
    const control = makeApplicantInteraction(
      "membershipJoinApplicant:committee-confirmation-edit",
      "button",
    );

    await executeApplicantJoinInteraction(control.interaction as never);

    assert.equal(persistedMember.registrationStep, "BASIC_INFORMATION");
    assertReplyContent(control.reply, messages.join.basicInformation);
    assert.deepEqual(events, ["deferReply", "db:update", "editReply"]);
  });

  it("handles notify from a fresh button interaction", async () => {
    persistedMember = memberAt("COMMITTEE_CONFIRMATION");
    const control = makeApplicantInteraction(
      "membershipJoinApplicant:committee-confirmation-notify",
      "button",
    );

    await executeApplicantJoinInteraction(control.interaction as never);

    assertReplyContent(
      control.reply,
      messages.join.notificationTimeout(persistedMember.notificationSentAt!),
    );
    assert.deepEqual(events, ["deferReply", "db:select", "editReply"]);
  });

  it("safely acknowledges a malformed applicant ID without I/O", async () => {
    const control = makeApplicantInteraction("membershipJoinApplicant:unknown", "button");

    await executeApplicantJoinInteraction(control.interaction as never);

    assertReplyContent(control.reply, messages.error.generic);
    assert.deepEqual(events, ["reply"]);
  });

  it("safely acknowledges an action delivered as the wrong interaction form", async () => {
    const control = makeApplicantInteraction(
      "membershipJoinApplicant:basic-information-submit",
      "button",
    );

    await executeApplicantJoinInteraction(control.interaction as never);

    assertReplyContent(control.reply, messages.error.generic);
    assert.deepEqual(events, ["reply"]);
  });
});
