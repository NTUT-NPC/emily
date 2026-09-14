const maximumPageBodyLength = 1_800;
const maximumFieldLength = 160;

interface RequestListEntry {
  discordId: bigint;
  email: string | null;
  name: string | null;
  studentId: string | null;
  notificationSentAt: Date | null;
}

export function buildRequestListReply(
  requests: RequestListEntry[],
  requestedPage: number,
): string {
  if (requests.length === 0) {
    return "目前沒有使用者正在等待幹部確認。";
  }

  const pageBodies: string[] = [];
  let pageBody = "";
  for (const request of requests) {
    const notificationStatus = request.notificationSentAt
      ? `<t:${Math.floor(request.notificationSentAt.getTime() / 1_000)}:R>`
      : "尚未通知";
    const line = `<@${request.discordId}> ${notificationStatus}: \`${formatField(request.email)}\`, \`${formatField(request.name)}\`, \`${formatField(request.studentId)}\``;
    const candidate = pageBody ? `${pageBody}\n${line}` : line;
    if (candidate.length > maximumPageBodyLength) {
      pageBodies.push(pageBody);
      pageBody = line;
    } else {
      pageBody = candidate;
    }
  }
  pageBodies.push(pageBody);

  const body = pageBodies[requestedPage - 1];
  if (!body) {
    return `頁碼超出範圍。目前共有 ${pageBodies.length} 頁。`;
  }

  return `目前有 ${requests.length} 位使用者正在等待幹部確認（第 ${requestedPage}/${pageBodies.length} 頁）：\n（\`電子郵件\`, \`姓名\`, \`學號\`）\n${body}`;
}

function formatField(value: string | null): string {
  const normalized = (value ?? "—")
    .replace(/\s+/gu, " ")
    .replaceAll("`", "ˋ")
    .trim();
  if (normalized.length <= maximumFieldLength) {
    return normalized;
  }

  let truncated = normalized.slice(0, maximumFieldLength - 1);
  if (/[\uD800-\uDBFF]$/u.test(truncated)) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}
