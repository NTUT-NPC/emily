/* eslint-disable no-irregular-whitespace */
/* eslint-disable vue/no-irregular-whitespace */
import type { Member } from "@prisma/client";

interface Config {
  registerCommands: boolean;
  memberJoinNotificationTimeoutSeconds: number;
  membershipNotificationChannelId: string;
  membershipRoleId: string;
}

const config: Config = {
  registerCommands: true,
  memberJoinNotificationTimeoutSeconds: 600,
  membershipNotificationChannelId: "1141944728598880346",
  membershipRoleId: "890876143362789378",
};

export default config;

interface Messages {
  error: {
    generic: string;
    notInDatabase: string;
    notAwaitingConfirmation: string;
  };
  join: {
    useDirectMessage: string;
    confirmationTimeout: string;
    introduction: string;
    basicInformation: string;
    committeeConfirmation: string;
    accept: string;
    reject: (reason: string) => string;
    alreadyJoined: string;
    notificationSent: string;
    notificationTimeout: (notificationSentDate: Date) => string;
    notification: (member: Member) => string;
  };
}

export const messages: Messages = {
  error: {
    generic: "糟糕，看來出了些小問題。請把這個問題回報給<@132112879439708160>，謝謝！",
    notInDatabase: "資料庫中沒有這個使用者。",
    notAwaitingConfirmation: "這個使用者並沒有等待幹部確認的加入請求。",
  },
  join: {
    useDirectMessage: "歡迎您加入我們！建議您私訊我以確保您的隱私喔！",
    confirmationTimeout: "timeout",
    introduction: `# 加入社員
很高興您願意加入我們！

如果您還不知道，以下是加入社員的好處：

- 終身無限參與所有社課
- 獲得一件精美的社團 T-Shirt
- 參加其他社團活動

加入社員的流程如下：

1. 填寫基本資料
2. 等待幹部確認
3. 加入成功！

那麼就讓我們開始吧！如果在加入過程遇到任何問題，請再私訊我一次「/社員 加入」看看。`,
    basicInformation: `# 填寫基本資料

要加入社員，請按下方的「📝 輸入基本資料」按鈕，並在填寫完成後按下「送出」。`,
    committeeConfirmation: `# 幹部確認
    
您的基本資料已經送出，我也已經通知幹部了！請讓幹部向您收取 500 元的社費，並等待幹部確認您的資料。`,
    accept: "恭喜您！您已經成功加入社團！我會分配幹部身份組給您，如果沒有得到身份組，請聯絡幹部。",
    reject(reason) {
      return `很抱歉，您的加入請求被拒絕了。理由：${reason}\n（您可以輸入「/社員 加入」再試一次）`;
    },
    alreadyJoined: "您已經成功加入社團！",
    notificationSent: "已通知幹部，請等待幹部確認。",
    notificationTimeout(notificationSentDate) {
      return `很抱歉，您在<t:${Math.floor(+notificationSentDate / 1000) + config.memberJoinNotificationTimeoutSeconds}:R>才能再通知一次幹部。`;
    },
    notification(member) {
      return `有新的社員加入請求！<@${member.discordId}> 想要加入社團。
- 電子郵件： ${member.email}
- 姓名　　： ${member.name}
- 學號　　： ${member.studentId}
`;
    },
  },
};
